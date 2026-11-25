import { useEffect, useRef, useState } from "react";

// Botão oficial "Entrar com Google" (Google Identity Services).
// O Google mostra a janelinha de escolher a conta e devolve um "credential" (ID token),
// que mandamos para a API conferir. Sem VITE_GOOGLE_CLIENT_ID, o botão não aparece.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_URL = "https://accounts.google.com/gsi/client";

let scriptPromise;
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Não foi possível carregar o login do Google."));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export default function GoogleButton({ onCredential, text = "continue_with" }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [failed, setFailed] = useState(false);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => callbackRef.current?.(response.credential),
          ux_mode: "popup",
          use_fedcm_for_prompt: true,
        });
        const width = Math.min(400, Math.max(220, containerRef.current.offsetWidth || 320));
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text,
          locale: "pt-BR",
          width,
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) return null;
  if (failed) {
    return <p className="text-center text-xs text-th-muted">O login com Google não carregou. Use e-mail e senha ou recarregue a página.</p>;
  }
  // colorScheme "light": o botão do Google é um iframe. Como o site usa color-scheme escuro,
  // o navegador pintava o fundo do iframe de branco (o retângulo branco em volta do botão).
  return <div ref={containerRef} className="flex min-h-[44px] w-full justify-center" style={{ colorScheme: "light" }} />;
}

export const googleLoginEnabled = Boolean(CLIENT_ID);

// Linha "ou" entre o botão do Google e o formulário.
export function OrDivider() {
  if (!CLIENT_ID) return null;
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-th-muted" aria-hidden="true">
      <span className="h-px flex-1 bg-th-line" />
      ou
      <span className="h-px flex-1 bg-th-line" />
    </div>
  );
}
