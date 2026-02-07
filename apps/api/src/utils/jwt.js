const jwt = require("jsonwebtoken");
const config = require("../config");

function signAccessToken(payload) {
  return jwt.sign(payload, config.jwtAccessSecret, { expiresIn: config.jwtAccessExpires });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpires });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwtRefreshSecret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
};
