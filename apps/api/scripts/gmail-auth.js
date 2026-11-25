// Gera o GMAIL_REFRESH_TOKEN uma única vez, no seu computador.
//
// Como usar (dentro de apps/api):
//   1. Coloque GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET no arquivo .env
//   2. Rode: npm run gmail:auth
//   3. Abra o link que aparecer, entre com o Gmail que vai enviar os e-mails e autorize
//   4. O refresh token é gravado no .env. Copie o mesmo valor para o Render (Environment).
//
// O cliente OAuth precisa ser do tipo "App para computador" (Desktop app) no Google Cloud:
// esse tipo aceita o retorno para http://127.0.0.1 em qualquer porta.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const SCOPE = "https://www.googleapis.com/auth/gmail.send"; // só permite ENVIAR, não ler e-mails
const ENV_PATH = path.join(__dirname, "../.env");

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Faltam GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET no apps/api/.env");
  process.exit(1);
}

const state = crypto.randomBytes(16).toString("hex");
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname !== "/callback") return res.writeHead(404).end();

  const send = (status, text) => {
    res.writeHead(status, { "content-type": "text/plain; charset=utf-8" }).end(text);
  };
  if (url.searchParams.get("state") !== state) return send(400, "Estado inválido. Rode o comando de novo.");
  if (url.searchParams.get("error")) {
    send(400, `Autorização cancelada: ${url.searchParams.get("error")}`);
    return server.close();
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: url.searchParams.get("code"),
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.refresh_token) throw new Error(data.error_description || data.error || "Google não devolveu refresh_token");

    const env = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
    const line = `GMAIL_REFRESH_TOKEN=${data.refresh_token}`;
    const updated = /^GMAIL_REFRESH_TOKEN=.*$/m.test(env)
      ? env.replace(/^GMAIL_REFRESH_TOKEN=.*$/m, line)
      : `${env.replace(/\s*$/, "")}\n${line}\n`;
    fs.writeFileSync(ENV_PATH, updated);

    send(200, "Pronto! Pode fechar esta aba e voltar para o terminal.");
    console.log("\nRefresh token gravado em apps/api/.env (GMAIL_REFRESH_TOKEN).");
    console.log("Copie o mesmo valor para o Render > trackhub-api > Environment.\n");
  } catch (error) {
    send(500, `Erro: ${error.message}`);
    console.error("Erro:", error.message);
  } finally {
    server.close();
  }
});

let redirectUri;
server.listen(0, "127.0.0.1", () => {
  redirectUri = `http://127.0.0.1:${server.address().port}/callback`;
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  console.log("\nAbra este link no navegador e autorize com o Gmail que vai enviar os e-mails:\n");
  console.log(auth.toString(), "\n");
});
