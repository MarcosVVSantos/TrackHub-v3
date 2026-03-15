const commentService = require("../services/commentService");

async function updateComment(req, res, next) {
  try {
    const result = await commentService.updateComment(req.user.sub, req.params.id, req.body.content);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function deleteComment(req, res, next) {
  try {
    const result = await commentService.deleteComment(req.user.sub, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  updateComment,
  deleteComment,
};
