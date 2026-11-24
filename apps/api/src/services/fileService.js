const prisma = require("../lib/prisma");
const { createNotification } = require("./notificationService");
const { ensureProjectRole } = require("./accessService");
const { withResolvedUrls, resolveFileUrl } = require("./storageService");
const { PUBLIC_USER_SELECT } = require("../utils/publicUser");

const MAX_VERSION_LENGTH = 30;

async function listProjectFiles(userId, projectId) {
  await ensureProjectRole(userId, projectId, "viewer");
  const files = await prisma.fileAsset.findMany({
    where: { projectId },
    include: { versions: true, uploader: { select: PUBLIC_USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });
  return withResolvedUrls(files);
}

async function addProjectFile({ projectId, uploaderId, file, versionName }) {
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
      versions: {
        create: {
          version,
          authorId: uploaderId,
        },
      },
    },
    include: { versions: true },
  });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
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
