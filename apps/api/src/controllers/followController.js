const followService = require("../services/followService");

async function listFollowing(req, res, next) {
  try {
    const data = await followService.listFollowing(req.user.sub);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function follow(req, res, next) {
  try {
    const result = await followService.followUser(req.user.sub, req.params.id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function unfollow(req, res, next) {
  try {
    const result = await followService.unfollowUser(req.user.sub, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listFollowing,
  follow,
  unfollow,
};