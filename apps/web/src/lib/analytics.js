// Analytics de produto com PostHog. Só liga quando VITE_POSTHOG_KEY estiver definida,
// então em desenvolvimento (sem a chave) nada é enviado.
const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

let started = false;

export function initAnalytics() {
  if (started || !KEY || typeof window === "undefined") return;
  started = true;

  // Snippet oficial do PostHog: cria uma fila e carrega a biblioteca do CDN deles.
  /* eslint-disable */
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  /* eslint-enable */

  window.posthog.init(KEY, { api_host: HOST, person_profiles: "identified_only" });
}

function call(method, ...args) {
  if (!KEY || typeof window === "undefined" || !window.posthog) return;
  try {
    window.posthog[method](...args);
  } catch {
    // Analytics nunca pode derrubar o app.
  }
}

export function track(event, properties) {
  call("capture", event, properties);
}

export function identify(user) {
  if (user?.id) call("identify", user.id, { username: user.username });
}

export function resetAnalytics() {
  call("reset");
}

// Eventos principais do funil, disparados a partir das chamadas da API.
const EVENT_ROUTES = [
  { method: "POST", pattern: /^\/auth\/register$/, event: "cadastro_concluido" },
  { method: "POST", pattern: /^\/projects$/, event: "projeto_criado" },
  { method: "POST", pattern: /^\/projects\/[^/]+\/invite$/, event: "convite_enviado" },
  { method: "POST", pattern: /^\/projects\/invites\/[^/]+\/accept$/, event: "convite_aceito" },
  { method: "POST", pattern: /^\/playlists$/, event: "playlist_criada" },
];

export function trackApiSuccess(method, path) {
  const clean = path.split("?")[0];
  const match = EVENT_ROUTES.find((route) => route.method === method && route.pattern.test(clean));
  if (match) track(match.event);
}
