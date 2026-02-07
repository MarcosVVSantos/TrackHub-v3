const express = require("express");
const multer = require("multer");
const path = require("path");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/userController");
const config = require("../config");

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(config.rootDir, config.uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${file.originalname}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/(image\/jpeg|image\/png)/.test(file.mimetype)) {
      const error = new Error("Envie uma imagem JPG ou PNG");
      error.status = 400;
      return cb(error);
    }
    return cb(null, true);
  },
});

router.get("/me", authenticate, controller.getMe);
router.put("/me", authenticate, controller.updateMe);
router.post("/avatar", authenticate, upload.single("avatar"), controller.uploadAvatar);

module.exports = router;
