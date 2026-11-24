const logger = require("./logger");

// Eventos que indicam ataque ou abuso. Todos saem com msg "security" e um type,
// então no painel de logs do Render basta buscar por "security" para ver tudo.
//
// Tipos usados:
//   login_failed          senha errada ou email inexistente
//   refresh_token_reuse   token já trocado foi usado de novo (possível roubo de sessão)
//   access_denied         tentativa de acessar algo sem permissão (403)
//   rate_limited          passou do limite de requisições (429)
//   upload_rejected       arquivo com tipo inválido ou disfarçado
//   ws_auth_failed        conexão de tempo real com token inválido
function logSecurityEvent(type, { req, ...fields } = {}) {
  logger.warn("security", {
    type,
    requestId: req?.id,
    ip: req?.ip,
    path: req?.originalUrl?.split("?")[0],
    method: req?.method,
    userId: req?.user?.sub,
    ...fields,
  });
}

module.exports = { logSecurityEvent };
