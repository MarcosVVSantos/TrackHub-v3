const jwt = require("jsonwebtoken");
const config = require("../config");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
  return res.status(401).json({ message: "Faça login para continuar" });
  }

  const [, token] = authHeader.split(" ");
  if (!token) {
  return res.status(401).json({ message: "Sessão expirada. Faça login novamente." });
  }

  try {
    const payload = jwt.verify(token, config.jwtAccessSecret);
    req.user = payload;
    return next();
  } catch (error) {
  return res.status(401).json({ message: "Sessão inválida ou expirada. Faça login novamente." });
  }
}

module.exports = authenticate;
