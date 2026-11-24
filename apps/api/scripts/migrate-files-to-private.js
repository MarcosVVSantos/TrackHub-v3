// Move arquivos de projeto antigos do bucket público para o bucket privado.
// Uso:
//   node scripts/migrate-files-to-private.js            -> simula (não muda nada)
//   node scripts/migrate-files-to-private.js --apply    -> copia e atualiza o banco
//   node scripts/migrate-files-to-private.js --apply --delete-public -> também apaga a cópia pública
require("dotenv").config();
const { S3Client, CopyObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const prisma = require("../src/lib/prisma");
const { PRIVATE_URL_PREFIX } = require("../src/services/storageService");

const apply = process.argv.includes("--apply");
const deletePublic = process.argv.includes("--delete-public");
const { R2_BUCKET, R2_PRIVATE_BUCKET, R2_PUBLIC_URL } = process.env;

async function main() {
  if (!R2_BUCKET || !R2_PRIVATE_BUCKET || !R2_PUBLIC_URL) {
    throw new Error("Defina R2_BUCKET, R2_PRIVATE_BUCKET e R2_PUBLIC_URL no .env");
  }

  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const files = await prisma.fileAsset.findMany({
    where: { url: { startsWith: `${R2_PUBLIC_URL}/` } },
    select: { id: true, url: true, storageKey: true, name: true },
  });

  console.log(`${files.length} arquivo(s) de projeto no bucket público.${apply ? "" : " (simulação: use --apply)"}`);

  let moved = 0;
  for (const file of files) {
    const key = file.storageKey || file.url.slice(R2_PUBLIC_URL.length + 1);
    console.log(`- ${file.name} (${key})`);
    if (!apply) continue;

    await client.send(
      new CopyObjectCommand({
        Bucket: R2_PRIVATE_BUCKET,
        Key: key,
        CopySource: `${R2_BUCKET}/${encodeURIComponent(key)}`,
      })
    );
    await prisma.fileAsset.update({ where: { id: file.id }, data: { url: `${PRIVATE_URL_PREFIX}${key}` } });
    if (deletePublic) {
      await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    }
    moved += 1;
  }

  if (apply) console.log(`${moved} arquivo(s) movido(s).`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
