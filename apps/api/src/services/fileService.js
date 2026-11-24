const prisma = require("../lib/prisma");
const { createNotification } = require("./notificationService");
const { ensureProjectRole } = require("./accessService");
const { withResolvedUrls, resolveFileUrl } = require("./storageService");
const { PUBLIC_USER_SELECT } = require("../utils/publicUser");
const { parseAudioMeta } = require("../utils/audioMeta");

const MAX_VERSION_LENGTH = 30;

async function listProjectFiles(userId, projectId) {
  await ensureProjectRole(userId, projectId, "viewer");
  const files = await prisma.fileAsset.findMany({
    where: { projectId },
    include: {
      versions: true,
      uploader: { select: PUBLIC_USER_SELECT },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return withResolvedUrls(files);
}

async function addProjectFile({ projectId, uploaderId, file, versionName, meta }) {
  await ensureProjectRole(uploaderId, projectId, "editor");
  const version = typeof versionName === "string" && versionName.trim()
    ? versionName.trim().slice(0, MAX_VERSION_LENGTH)
    : "v1";

  const asset = await prisma.fileAsset.create({
    data: {
      projectId,
      uploaderId,
      name: String(file.originalname || "arquivo").slice(0, 200),
      type: file.mimetype,
      url: file.url,
      storageKey: file.filename,
      sizeBytes: BigInt(file.size || 0),
      ...(String(file.mimetype).startsWith("audio/") ? parseAudioMeta(meta) : {}),
      versions: {
        create: {
          version,
          authorId: uploaderId,
        },
      },
    },
    include: { versions: true },
  });

  // Mexe no updatedAt do projeto para ele subir em "Continue de onde parou".
  const project = await prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
  if (project && project.ownerId !== uploaderId) {
    await createNotification({
      userId: project.ownerId,
      actorId: uploaderId,
      type: "upload",
      message: `Novo upload no projeto ${project.name}`,
      link: `/projects/${projectId}`,
    });
  }

  return { ...asset, url: await resolveFileUrl(asset.url) };
}

module.exports = {
  listProjectFiles,
  addProjectFile,
};
