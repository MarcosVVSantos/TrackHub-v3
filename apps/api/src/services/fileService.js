const prisma = require("../lib/prisma");
const { createNotification } = require("./notificationService");
const { ensureProjectMember } = require("./accessService");

async function listProjectFiles(userId, projectId) {
  await ensureProjectMember(userId, projectId);
  return prisma.fileAsset.findMany({
    where: { projectId },
    include: { versions: true, uploader: true },
    orderBy: { createdAt: "desc" },
  });
}

async function addProjectFile({ projectId, uploaderId, file, versionName }) {
  await ensureProjectMember(uploaderId, projectId);
  const asset = await prisma.fileAsset.create({
    data: {
      projectId,
      uploaderId,
      name: file.originalname,
      type: file.mimetype,
      url: file.url,
      storageKey: file.filename,
      sizeBytes: BigInt(file.size ?? 0),
      versions: {
        create: {
          version: versionName || "v1",
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
      type: "upload",
      message: `Novo upload no projeto ${project.name}`,
      link: `/projects/${projectId}`,
    });
  }

  return asset;
}

module.exports = {
  listProjectFiles,
  addProjectFile,
};
