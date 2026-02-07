const feedService = require("../services/feedService");

async function listFeed(req, res, next) {
  try {
    const feed = await feedService.listFeed();
    res.json(feed);
  } catch (error) {
    next(error);
  }
}

async function getTrack(req, res, next) {
  try {
    const track = await feedService.getTrack(req.params.id);
    res.json(track);
  } catch (error) {
    next(error);
  }
}

async function likeTrack(req, res, next) {
  try {
    const result = await feedService.likeTrack(req.params.id, req.user.sub);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function commentTrack(req, res, next) {
  try {
    const result = await feedService.addTrackComment(req.params.id, req.user.sub, req.body.content);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function playTrack(req, res, next) {
  try {
    const result = await feedService.addTrackPlay(req.params.id, req.user.sub);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listFeed,
  getTrack,
  likeTrack,
  commentTrack,
  playTrack,
};
