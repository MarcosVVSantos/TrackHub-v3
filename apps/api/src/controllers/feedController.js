const feedService = require("../services/feedService");

async function listFeed(req, res, next) {
  try {
    const feed = await feedService.listProductions(req.user.sub);
    res.json(feed);
  } catch (error) {
    next(error);
  }
}

async function listProductions(req, res, next) {
  try {
    const feed = await feedService.listProductions(req.user.sub);
    res.json(feed);
  } catch (error) {
    next(error);
  }
}

async function listSocial(req, res, next) {
  try {
    const feed = await feedService.listSocialPosts(req.user.sub);
    res.json(feed);
  } catch (error) {
    next(error);
  }
}

async function createSocial(req, res, next) {
  try {
    const post = await feedService.createSocialPost(req.user.sub, req.body);
    res.status(201).json(post);
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

async function saveTrack(req, res, next) {
  try {
    const result = await feedService.saveTrack(req.params.id, req.user.sub);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function unsaveTrack(req, res, next) {
  try {
    const result = await feedService.unsaveTrack(req.params.id, req.user.sub);
    res.json(result);
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

async function updateTrack(req, res, next) {
  try {
    const result = await feedService.updateTrackTitle(req.params.id, req.user.sub, req.body.title);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function likeSocial(req, res, next) {
  try {
    const result = await feedService.likeSocialPost(req.params.id, req.user.sub);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function commentSocial(req, res, next) {
  try {
    const result = await feedService.commentSocialPost(req.params.id, req.user.sub, req.body.content);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function saveSocial(req, res, next) {
  try {
    const result = await feedService.saveSocialPost(req.params.id, req.user.sub);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function unsaveSocial(req, res, next) {
  try {
    const result = await feedService.unsaveSocialPost(req.params.id, req.user.sub);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function listPlaylists(req, res, next) {
  try {
    const data = await feedService.listPlaylists(req.user.sub);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function savePlaylist(req, res, next) {
  try {
    const result = await feedService.savePlaylist(req.params.id, req.user.sub);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function unsavePlaylist(req, res, next) {
  try {
    const result = await feedService.unsavePlaylist(req.params.id, req.user.sub);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listFeed,
  listProductions,
  listSocial,
  createSocial,
  getTrack,
  updateTrack,
  likeTrack,
  saveTrack,
  unsaveTrack,
  commentTrack,
  playTrack,
  likeSocial,
  commentSocial,
  saveSocial,
  unsaveSocial,
  listPlaylists,
  savePlaylist,
  unsavePlaylist,
};
