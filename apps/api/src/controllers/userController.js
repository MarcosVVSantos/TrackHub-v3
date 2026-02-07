const fs = require("fs/promises");
const path = require("path");
const userService = require("../services/userService");
const config = require("../config");

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
    const avatarUrl = `${config.publicUrl}/uploads/${req.file.filename}`;
    const updated = await userService.updateAvatar(req.user.sub, avatarUrl);

    if (current?.avatarUrl) {
      const filename = current.avatarUrl.split("/uploads/")[1];
      if (filename) {
        const filePath = path.join(config.rootDir, config.uploadDir, filename);
        fs.unlink(filePath).catch(() => null);
      }
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMe,
  updateMe,
  uploadAvatar,
};
