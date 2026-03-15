const projectService = require("../services/projectService");
const commentService = require("../services/commentService");
const fileService = require("../services/fileService");
const taskService = require("../services/taskService");
const storage = require("../services/storageService");

async function listProjects(req, res, next) {
  try {
    const tags = req.query.tags ? req.query.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [];
    const status = req.query.status
      ? req.query.status.split(",").map((value) => value.trim()).filter(Boolean)
      : [];
    const projects = await projectService.listProjects(req.user.sub, { tags, status });
    res.json(projects);
  } catch (error) {
    next(error);
  }
}

async function getProject(req, res, next) {
  try {
    const project = await projectService.getProject(req.user.sub, req.params.id);
    res.json(project);
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
    const filePath = path.join(config.rootDir, config.uploadDir, file.storageKey);
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": file.type,
      });
      stream.pipe(res);
      return;
    }

    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": file.type,
    });
    fs.createReadStream(filePath).pipe(res);
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
    const { url, key } = await storage.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    const file = await fileService.addProjectFile({
      projectId: req.params.id,
      uploaderId: req.user.sub,
      file: { ...req.file, url, filename: key },
      versionName: req.body.version,
    });
    res.status(201).json(file);
  } catch (error) {
    next(error);
  }
}

async function uploadCover(req, res, next) {
  try {
    const { url } = await storage.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
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

module.exports = {
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
