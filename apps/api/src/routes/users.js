const express = require("express");
const multer = require("multer");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/userController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
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
router.get("/explore", authenticate, controller.explore);
router.put("/me", authenticate, controller.updateMe);
router.post("/avatar", authenticate, upload.single("avatar"), controller.uploadAvatar);

module.exports = router;
