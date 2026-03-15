const profileService = require("../services/profileService");

async function getProfile(req, res, next) {
  try {
    const data = await profileService.getProfile(req.user.sub, req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function listProductions(req, res, next) {
  try {
    const data = await profileService.listProductions(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function listPosts(req, res, next) {
  try {
    const data = await profileService.listPosts(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function listPublicProjects(req, res, next) {
  try {
    const data = await profileService.listPublicProjects(req.params.id, req.user.sub);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function listPlaylists(req, res, next) {
  try {
    const data = await profileService.listPlaylists(req.params.id, req.user.sub);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  listProductions,
  listPublicProjects,
  listPosts,
  listPlaylists,
};