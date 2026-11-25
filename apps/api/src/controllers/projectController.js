const projectService = require("../services/projectService");
const commentService = require("../services/commentService");
const fileService = require("../services/fileService");
const taskService = require("../services/taskService");
const fileCommentService = require("../services/fileCommentService");
const storage = require("../services/storageService");
const { validateImage, validateProjectFile } = require("../utils/fileType");

async function listProjects(req, res, next) {
  try {
    const tags = req.query.tags ? req.query.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [];
    const status = req.query.status
      ? req.query.status.split(",").map((value) => value.trim()).filter(Boolean)
      : [];
    const projects = await projectService.listProjects(req.user.sub, { tags, status });
    const withUrls = await Promise.all(
      projects.map(async (project) => ({ ...project, files: await storage.withResolvedUrls(project.files) }))
    );
    res.json(withUrls);
  } catch (error) {
    next(error);
  }
}

async function getProject(req, res, next) {
  try {
    const project = await projectService.getProject(req.user.sub, req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Projeto não encontrado" });
    }
    return res.json({ ...project, files: await storage.withResolvedUrls(project.files) });
  } catch (error) {
    next(error);
  }
}

async function createProject(req, res, next) {
  try {
    const project = await projectService.createProject(req.user.sub, req.body);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
}

async function updateProject(req, res, next) {
  try {
    const project = await projectService.updateProject(req.user.sub, req.params.id, req.body);
    res.json(project);
  } catch (error) {
    next(error);
  }
}

async function archiveProject(req, res, next) {
  try {
    const project = await projectService.archiveProject(req.user.sub, req.params.id);
    res.json(project);
  } catch (error) {
    next(error);
  }
}

async function listTags(req, res, next) {
  try {
    const tags = await projectService.listTags(req.user.sub);
    res.json(tags);
  } catch (error) {
    next(error);
  }
}

async function updateOrder(req, res, next) {
  try {
    const updated = await projectService.updateProjectOrder(req.user.sub, req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

async function statusHistory(req, res, next) {
  try {
    const history = await projectService.listStatusHistory(req.user.sub, req.params.id);
    res.json(history);
  } catch (error) {
    next(error);
  }
}

async function streamAudio(req, res, next) {
  try {
    const file = await projectService.getProjectAudio(req.user.sub, req.params.id);
    const url = await storage.resolveFileUrl(file.url);
    res.set("Cache-Control", "no-store");
    // ?format=json devolve o link (assinado) em vez de redirecionar. O front usa isso para
    // tocar no <audio> direto do R2: um fetch() seguindo o redirect esbarraria no CORS do bucket.
    if (req.query.format === "json") return res.json({ url, fileId: file.id });
    return res.redirect(url);
  } catch (error) {
    next(error);
  }
}

async function invitePartner(req, res, next) {
  try {
    const result = await projectService.invitePartner(req.user.sub, req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function listInvites(req, res, next) {
  try {
    const invites = await projectService.listInvites(req.user.sub);
    res.json(invites);
  } catch (error) {
    next(error);
  }
}

async function acceptInvite(req, res, next) {
  try {
    const result = await projectService.acceptInvite(req.user.sub, req.params.inviteId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function declineInvite(req, res, next) {
  try {
    const result = await projectService.declineInvite(req.user.sub, req.params.inviteId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function updateRole(req, res, next) {
  try {
    const result = await projectService.updatePartnerRole(req.user.sub, req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function removePartner(req, res, next) {
  try {
    const result = await projectService.removePartner(req.user.sub, req.params.id, req.params.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function listComments(req, res, next) {
  try {
    const comments = await commentService.listProjectComments(req.user.sub, req.params.id);
    res.json(comments);
  } catch (error) {
    next(error);
  }
}

async function addComment(req, res, next) {
  try {
    const comment = await commentService.addProjectComment(req.user.sub, req.params.id, req.body.content);
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
}

async function listFiles(req, res, next) {
  try {
    const files = await fileService.listProjectFiles(req.user.sub, req.params.id);
    res.json(files);
  } catch (error) {
    next(error);
  }
}

async function addFile(req, res, next) {
  try {
    // Tipo real detectado pelos bytes do arquivo; o que o navegador diz é ignorado.
    const type = validateProjectFile(req.file);
    const { url, key } = await storage.uploadFile(req.file.buffer, {
      mime: type.mime,
      ext: type.ext,
      download: type.download,
      visibility: "private",
      filename: req.file.originalname,
    });
    const file = await fileService.addProjectFile({
      projectId: req.params.id,
      uploaderId: req.user.sub,
      file: { ...req.file, mimetype: type.mime, url, filename: key },
      versionName: req.body.version,
      meta: { durationSec: req.body.durationSec, peaks: req.body.peaks },
    });
    res.status(201).json(file);
  } catch (error) {
    next(error);
  }
}

async function uploadCover(req, res, next) {
  try {
    const type = validateImage(req.file);
    const { url } = await storage.uploadFile(req.file.buffer, { mime: type.mime, ext: type.ext });
    const project = await projectService.updateProject(req.user.sub, req.params.id, { coverUrl: url });
    res.json({ coverUrl: project.coverUrl });
  } catch (error) {
    next(error);
  }
}

async function listTasks(req, res, next) {
  try {
    const tasks = await taskService.listTasks(req.user.sub, req.params.id);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
}

async function addTask(req, res, next) {
  try {
    const task = await taskService.addTask(req.user.sub, req.params.id, req.body);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
}

async function updateTask(req, res, next) {
  try {
    res.json(await taskService.updateTask(req.user.sub, req.params.id, req.params.taskId, req.body));
  } catch (error) {
    next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    res.json(await taskService.deleteTask(req.user.sub, req.params.id, req.params.taskId));
  } catch (error) {
    next(error);
  }
}

async function listFileComments(req, res, next) {
  try {
    res.json(await fileCommentService.listFileComments(req.user.sub, req.params.id, req.params.fileId));
  } catch (error) {
    next(error);
  }
}

async function addFileComment(req, res, next) {
  try {
    const comment = await fileCommentService.addFileComment(req.user.sub, req.params.id, req.params.fileId, req.body);
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
}

async function deleteFileComment(req, res, next) {
  try {
    res.json(
      await fileCommentService.deleteFileComment(req.user.sub, req.params.id, req.params.fileId, req.params.commentId)
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  updateTask,
  deleteTask,
  listFileComments,
  addFileComment,
  deleteFileComment,
  listProjects,
  getProject,
  createProject,
  updateProject,
  archiveProject,
  listTags,
  updateOrder,
  statusHistory,
  streamAudio,
  invitePartner,
  listInvites,
  acceptInvite,
  declineInvite,
  updateRole,
  removePartner,
  listComments,
  addComment,
  listFiles,
  addFile,
  uploadCover,
  listTasks,
  addTask,
};
