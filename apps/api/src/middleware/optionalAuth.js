const jwt = require("jsonwebtoken");
const config = require("../config");

// Para rotas públicas: identifica o usuário se ele mandou um token válido,
// mas deixa passar quem não está logado (req.user fica vazio).
function optionalAuth(req, res, next) {
  const [, token] = (req.headers.authorization || "").split(" ");
  if (token) {
    try {
      req.user = jwt.verify(token, config.jwtAccessSecret);
    } catch {
      req.user = undefined;
    }
  }
  next();
}

module.exports = optionalAuth;
