const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand } = require("@aws-sdk/client-s3");
const { randomUUID } = require("crypto");

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Bucket público: capas, avatares e faixas publicadas.
const PUBLIC_BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;
// Bucket privado: arquivos dos projetos (beats e versões não lançadas).
// Sem acesso público; o app gera links temporários assinados.
const PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET;
const PRIVATE_URL_PREFIX = "r2-private://";
const SIGNED_URL_TTL_SECONDS = Number(process.env.SIGNED_URL_TTL_SECONDS || 3600);

let warnedNoPrivateBucket = false;

// Nos testes (STORAGE_DRIVER=memory) nada vai para o R2: os uploads só geram uma URL falsa.
const MEMORY_DRIVER = process.env.STORAGE_DRIVER === "memory";

function hasPrivateBucket() {
  return Boolean(PRIVATE_BUCKET);
}

async function uploadFile(buffer, { mime, ext, download = false, visibility = "public", filename }) {
  if (MEMORY_DRIVER) {
    const key = `${randomUUID()}${ext}`;
    return { key, url: visibility === "private" ? `${PRIVATE_URL_PREFIX}${key}` : `${PUBLIC_URL}/${key}` };
  }

  const usePrivate = visibility === "private" && hasPrivateBucket();

  if (visibility === "private" && !usePrivate && !warnedNoPrivateBucket) {
    warnedNoPrivateBucket = true;
    console.warn("R2_PRIVATE_BUCKET não configurado: arquivos de projeto continuam no bucket público.");
  }

  const key = `${randomUUID()}${ext}`;
  const safeName = (filename || `arquivo${ext}`).replace(/[^\w.\- ]+/g, "_").slice(0, 120);

  await client.send(
    new PutObjectCommand({
      Bucket: usePrivate ? PRIVATE_BUCKET : PUBLIC_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mime,
      ContentDisposition: download ? `attachment; filename="${safeName}"` : "inline",
      CacheControl: usePrivate ? "private, max-age=3600" : "public, max-age=31536000, immutable",
    })
  );

  return {
    key,
    url: usePrivate ? `${PRIVATE_URL_PREFIX}${key}` : `${PUBLIC_URL}/${key}`,
  };
}

function isPublicStorageUrl(url) {
  return typeof url === "string" && Boolean(PUBLIC_URL) && url.startsWith(`${PUBLIC_URL}/`);
}

// Converte a URL guardada no banco em uma URL que o navegador consegue abrir.
// Arquivos privados viram um link assinado que expira.
async function resolveFileUrl(url) {
  if (typeof url !== "string" || !url.startsWith(PRIVATE_URL_PREFIX)) return url;

  const key = url.slice(PRIVATE_URL_PREFIX.length);
  if (MEMORY_DRIVER) return `https://signed.test/${key}`;
  // Carregado sob demanda: só é necessário quando há bucket privado.
  const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
  return getSignedUrl(client, new GetObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key }), {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
}

async function withResolvedUrls(files) {
  if (!Array.isArray(files)) return files;
  return Promise.all(files.map(async (file) => ({ ...file, url: await resolveFileUrl(file.url) })));
}

async function deleteFile(key, { privateFile = false } = {}) {
  if (!key || MEMORY_DRIVER) return;
  const bucket = privateFile ? PRIVATE_BUCKET : PUBLIC_BUCKET;
  if (!bucket) return;
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => null);
}

// Usado pelo /ready: confere se os buckets existem e as credenciais funcionam.
async function checkBuckets() {
  if (MEMORY_DRIVER) return;
  const buckets = [PUBLIC_BUCKET, PRIVATE_BUCKET].filter(Boolean);
  if (!buckets.length) throw new Error("Nenhum bucket configurado");
  await Promise.all(buckets.map((bucket) => client.send(new HeadBucketCommand({ Bucket: bucket }))));
}

module.exports = {
  checkBuckets,
  uploadFile,
  deleteFile,
  resolveFileUrl,
  withResolvedUrls,
  isPublicStorageUrl,
  hasPrivateBucket,
  PRIVATE_URL_PREFIX,
};
