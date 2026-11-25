const path = require("path");
// Banco falso: estes testes só conferem a verificação do token, não gravam nada.
require.cache[require.resolve(path.join(__dirname, "../src/lib/prisma"))] = { exports: {} };

const { test, before, after } = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// Testes de "Entrar com Google" sem falar com o Google: geramos um par de chaves,
// fingimos ser o servidor de chaves públicas do Google e assinamos tokens de teste.
const CLIENT_ID = "trackhub-test.apps.googleusercontent.com";
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const attacker = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const KID = "chave-teste";

let originalFetch;
before(() => {
  process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
  originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    headers: new Map([["cache-control", "max-age=3600"]]),
    json: async () => ({ keys: [{ ...publicKey.export({ format: "jwk" }), kid: KID, alg: "RS256", use: "sig" }] }),
  });
});
after(() => {
  global.fetch = originalFetch;
});

const { verifyGoogleIdToken } = require("../src/services/googleAuthService");

function token(overrides = {}, key = privateKey) {
  return jwt.sign(
    { sub: "1234567890", email: "Artista@Gmail.com", email_verified: true, name: "Artista", ...overrides },
    key,
    {
      algorithm: "RS256",
      keyid: KID,
      audience: CLIENT_ID,
      issuer: "https://accounts.google.com",
      ...("exp" in overrides ? {} : { expiresIn: "5m" }),
    }
  );
}

test("aceita token válido do Google e normaliza o e-mail", async () => {
  const profile = await verifyGoogleIdToken(token());
  assert.deepStrictEqual(profile, { googleId: "1234567890", email: "artista@gmail.com", name: "Artista" });
});

test("recusa token assinado por outra chave (falsificado)", async () => {
  await assert.rejects(verifyGoogleIdToken(token({}, attacker.privateKey)), (error) => error.status === 401);
});

test("recusa token emitido para outro app (audience diferente)", async () => {
  const other = jwt.sign({ sub: "1", email: "a@b.com", email_verified: true }, privateKey, {
    algorithm: "RS256",
    keyid: KID,
    audience: "outro-app.apps.googleusercontent.com",
    issuer: "https://accounts.google.com",
  });
  await assert.rejects(verifyGoogleIdToken(other), (error) => error.status === 401);
});

test("recusa e-mail não verificado pelo Google", async () => {
  await assert.rejects(verifyGoogleIdToken(token({ email_verified: false })), (error) => error.status === 401);
});

test("recusa token vencido", async () => {
  const expired = token({ exp: Math.floor(Date.now() / 1000) - 60 });
  await assert.rejects(verifyGoogleIdToken(expired), (error) => error.status === 401);
});

test("recusa lixo no lugar do token", async () => {
  await assert.rejects(verifyGoogleIdToken("nao-e-um-jwt"), (error) => error.status === 401);
  await assert.rejects(verifyGoogleIdToken({ $ne: null }), (error) => error.status === 400);
});
