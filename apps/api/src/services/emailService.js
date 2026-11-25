const logger = require("../utils/logger");

// Envio de e-mails transacionais (ex.: redefinição de senha).
//
// Por que API HTTP e não SMTP? O plano gratuito do Render bloqueia as portas de SMTP
// (25, 465 e 587). Por isso os envios saem por HTTPS, por uma destas opções:
//
//  Gmail API (envia em nome de uma conta Gmail; ~500 e-mails/dia):
//   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET   credenciais OAuth do Google Cloud
//   GMAIL_REFRESH_TOKEN                    gerado uma vez com `npm run gmail:auth`
//
//  Brevo (300 e-mails/dia):
//   BREVO_API_KEY
//
//  Comuns:
//   EMAIL_FROM        remetente (na Gmail API, o próprio Gmail autorizado)
//   EMAIL_FROM_NAME   nome que aparece para quem recebe (padrão: TrackHub)
//   EMAIL_DRIVER      "gmail" | "brevo" | "log" | "memory" (padrão: o que estiver configurado, senão log)
//
// Sem chave (desenvolvimento e testes), o e-mail vai para o log do servidor e para
// uma "caixa de saída" em memória, para dar para testar o fluxo inteiro sem enviar nada.
const outbox = [];

function driver() {
  if (process.env.EMAIL_DRIVER) return process.env.EMAIL_DRIVER;
  if (process.env.GMAIL_REFRESH_TOKEN) return "gmail";
  return process.env.BREVO_API_KEY ? "brevo" : "log";
}

// ---------- Gmail API ----------
// O refresh token não expira sozinho; com ele pedimos um access token (vale ~1h) e guardamos em memória.
let gmailAccess = { token: null, expiresAt: 0 };

async function gmailAccessToken() {
  if (gmailAccess.token && Date.now() < gmailAccess.expiresAt - 60_000) return gmailAccess.token;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Google recusou o token: ${data.error || response.status}`);
  gmailAccess = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return gmailAccess.token;
}

// Cabeçalhos com acento precisam ir codificados (RFC 2047).
const encodeHeader = (value) => `=?UTF-8?B?${Buffer.from(String(value), "utf8").toString("base64")}?=`;
const base64Lines = (value) => Buffer.from(value, "utf8").toString("base64").replace(/.{76}/g, "$&\r\n");

function buildMime({ to, subject, html, text }) {
  const boundary = `trackhub-${Date.now().toString(36)}`;
  const from = `${encodeHeader(process.env.EMAIL_FROM_NAME || "TrackHub")} <${process.env.EMAIL_FROM}>`;
  return [
    `From: ${from}`,
    `To: <${to}>`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(text || ""),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(html || ""),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

async function sendWithGmail(message) {
  if (/[\r\n<>]/.test(message.to)) throw new Error("Destinatário inválido");
  const token = await gmailAccessToken();
  const raw = Buffer.from(buildMime(message), "utf8").toString("base64url");
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gmail respondeu ${response.status}: ${body.slice(0, 200)}`);
  }
}

async function sendWithBrevo({ to, subject, html, text }) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: process.env.EMAIL_FROM, name: process.env.EMAIL_FROM_NAME || "TrackHub" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Brevo respondeu ${response.status}: ${body.slice(0, 200)}`);
  }
}

async function sendEmail(message) {
  const mode = driver();
  if (mode === "gmail") return sendWithGmail(message);
  if (mode === "brevo") return sendWithBrevo(message);

  outbox.push({ ...message, sentAt: new Date() });
  if (outbox.length > 50) outbox.shift();

  if (process.env.NODE_ENV === "production") {
    // Em produção sem chave, avisamos no log (sem o conteúdo, que pode ter links secretos).
    logger.error("email_not_configured", { subject: message.subject });
    return;
  }
  if (mode === "log") {
    logger.info("email_dev", { to: message.to, subject: message.subject, text: message.text });
  }
}

module.exports = { sendEmail, outbox, buildMime };
