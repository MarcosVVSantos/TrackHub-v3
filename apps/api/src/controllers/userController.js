const userService = require("../services/userService");
const storage = require("../services/storageService");

async function getMe(req, res, next) {
  try {
    const user = await userService.getMe(req.user.sub);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

async function updateMe(req, res, next) {
  try {
    const updated = await userService.updateMe(req.user.sub, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      const error = new Error("Selecione uma imagem para atualizar o avatar");
      error.status = 400;
      throw error;
    }

    const current = await userService.getMe(req.user.sub);
    const { url } = await storage.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    const updated = await userService.updateAvatar(req.user.sub, url);

    if (current?.avatarUrl) {
      const oldKey = current.avatarUrl.split("/").pop();
      await storage.deleteFile(oldKey);
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

async function explore(req, res, next) {
  try {
    const data = await userService.listExplore(req.user.sub, req.query.q || "");
    res.json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMe,
  updateMe,
  uploadAvatar,
  explore,
};
