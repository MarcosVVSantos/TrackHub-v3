const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { randomUUID } = require("crypto");
const path = require("path");

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function uploadFile(buffer, originalname, mimetype) {
  const ext = path.extname(originalname);
  const key = `${randomUUID()}${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );

  return { key, url: `${PUBLIC_URL}/${key}` };
}

async function deleteFile(key) {
  if (!key) return;
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })).catch(() => null);
}

module.exports = { uploadFile, deleteFile };
