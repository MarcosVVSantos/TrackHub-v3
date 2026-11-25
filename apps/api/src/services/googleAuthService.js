const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { createSession } = require("./authService");

// "Entrar com Google".
//
// O botão do Google (no front) devolve um ID token: um JWT assinado pelo Google dizendo
// "esta pessoa é fulano@gmail.com". Aqui conferimos a assinatura com as chaves públicas
// do Google, para ninguém conseguir inventar um token. Sem biblioteca extra: o Node já
// sabe ler as chaves no formato JWK.
const GOOGLE_KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

let keyCache = { keys: new Map(), expiresAt: 0 };

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function googlePublicKey(kid) {
  if (Date.now() > keyCache.expiresAt || !keyCache.keys.has(kid)) {
    const response = await fetch(GOOGLE_KEYS_URL, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw httpError(503, "Não foi possível falar com o Google. Tente de novo.");
    const { keys } = await response.json();
    // O Google diz por quanto tempo as chaves valem (Cache-Control: max-age).
    const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get("cache-control") || "")?.[1] || 3600);
    keyCache = {
      keys: new Map(keys.map((key) => [key.kid, crypto.createPublicKey({ key, format: "jwk" })])),
      expiresAt: Date.now() + maxAge * 1000,
    };
  }
  const key = keyCache.keys.get(kid);
  if (!key) throw httpError(401, "Login com Google inválido. Tente de novo.");
  return key;
}

async function verifyGoogleIdToken(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw httpError(503, "Login com Google não está configurado.");
  if (typeof idToken !== "string" || idToken.length > 4096) throw httpError(400, "Login com Google inválido.");

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded?.header?.kid) throw httpError(401, "Login com Google inválido. Tente de novo.");

  let payload;
  try {
    payload = jwt.verify(idToken, await googlePublicKey(decoded.header.kid), {
      algorithms: ["RS256"],
      audience: clientId, // o token tem que ter sido emitido para o NOSSO app
      issuer: GOOGLE_ISSUERS,
    });
  } catch (error) {
    if (error.status) throw error;
    throw httpError(401, "Login com Google expirou ou é inválido. Tente de novo.");
  }

  if (!payload.sub || !payload.email || payload.email_verified !== true) {
    throw httpError(401, "Sua conta Google não tem um e-mail verificado.");
  }
  return { googleId: payload.sub, email: payload.email.trim().toLowerCase(), name: payload.name || payload.given_name || "" };
}

// Gera um @usuario livre a partir do e-mail (a pessoa pode trocar depois em Conta).
async function availableUsername(email) {
  const base = (email.split("@")[0] || "artista")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_.]/g, "")
    .slice(0, 20)
    .padEnd(3, "0");
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}${crypto.randomInt(100, 9999)}`;
    const taken = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${base.slice(0, 12)}${crypto.randomBytes(4).toString("hex")}`;
}

async function loginWithGoogle(idToken) {
  const profile = await verifyGoogleIdToken(idToken);

  // 1) Já entrou com Google antes.
  let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
  let isNew = false;

  if (!user) {
    // 2) Já tem conta com o mesmo e-mail (criada com senha): liga ao Google.
    //    É seguro porque o Google confirmou que o e-mail é dessa pessoa (email_verified).
    const existing = await prisma.user.findUnique({ where: { email: profile.email } });
    if (existing) {
      if (existing.googleId && existing.googleId !== profile.googleId) {
        throw httpError(409, "Este e-mail já está ligado a outra conta Google.");
      }
      user = await prisma.user.update({ where: { id: existing.id }, data: { googleId: profile.googleId } });
    } else {
      // 3) Conta nova, sem senha (dá para criar uma depois em "Esqueci minha senha").
      user = await prisma.user.create({
        data: {
          email: profile.email,
          googleId: profile.googleId,
          username: await availableUsername(profile.email),
          name: (profile.name || profile.email.split("@")[0]).slice(0, 60),
          passwordHash: null,
        },
      });
      isNew = true;
    }
  }

  if (!user.isActive) throw httpError(403, "Esta conta está desativada.");
  const session = await createSession(user);
  return { ...session, isNew };
}

module.exports = { loginWithGoogle, verifyGoogleIdToken, availableUsername };
