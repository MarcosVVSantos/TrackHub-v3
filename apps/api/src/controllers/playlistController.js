const playlistService = require("../services/playlistService");

async function createPlaylist(req, res, next) {
  try {
    const playlist = await playlistService.createPlaylist(req.user.sub, req.body);
    res.status(201).json(playlist);
  } catch (error) {
    next(error);
  }
}

async function listAutoPlaylists(req, res, next) {
  try {
    res.json(await playlistService.listAutoPlaylists(req.user.sub));
  } catch (error) {
    next(error);
  }
}

async function listMyPlaylists(req, res, next) {
  try {
    const playlists = await playlistService.listMyPlaylists(req.user.sub);
    res.json(playlists);
  } catch (error) {
    next(error);
  }
}

async function getPlaylist(req, res, next) {
  try {
    const playlist = await playlistService.getPlaylist(req.params.id, req.user.sub);
    res.json(playlist);
  } catch (error) {
    next(error);
  }
}

async function updatePlaylist(req, res, next) {
  try {
    const playlist = await playlistService.updatePlaylist(req.user.sub, req.params.id, req.body);
    res.json(playlist);
  } catch (error) {
    next(error);
  }
}

async function deletePlaylist(req, res, next) {
  try {
    await playlistService.deletePlaylist(req.user.sub, req.params.id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function addTrack(req, res, next) {
  try {
    const entry = await playlistService.addTrack(req.user.sub, req.params.id, req.body.trackId);
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
}

async function removeTrack(req, res, next) {
  try {
    await playlistService.removeTrack(req.user.sub, req.params.id, req.params.trackId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function reorderTracks(req, res, next) {
  try {
    await playlistService.reorderTracks(req.user.sub, req.params.id, req.body.trackIds);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function searchPublicTracks(req, res, next) {
  try {
    const q = req.query.q || "";
    const playlistId = req.query.playlistId || null;
    const tracks = await playlistService.searchPublicTracks(req.user.sub, q, playlistId);
    res.json(tracks);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listAutoPlaylists,
  createPlaylist,
  listMyPlaylists,
  getPlaylist,
  updatePlaylist,
  deletePlaylist,
  addTrack,
  removeTrack,
  reorderTracks,
  searchPublicTracks,
};
