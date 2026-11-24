// Valida a duração e a forma de onda enviadas junto com um upload de áudio.
// Os picos são calculados no navegador de quem envia (Web Audio), então nunca confiamos neles
// cegamente: no máximo 400 números entre 0 e 1, arredondados.
const MAX_PEAKS = 400;
const MAX_DURATION_SEC = 60 * 60 * 3;

function parseAudioMeta({ durationSec, peaks } = {}) {
  const meta = {};

  const duration = Number(durationSec);
  if (durationSec !== undefined && Number.isFinite(duration) && duration > 0 && duration <= MAX_DURATION_SEC) {
    meta.durationSec = Math.round(duration * 10) / 10;
  }

  let list = peaks;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      list = null;
    }
  }
  if (Array.isArray(list) && list.length > 0 && list.length <= MAX_PEAKS) {
    const clean = list.map((value) => Number(value));
    if (clean.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) {
      meta.peaks = clean.map((value) => Math.round(value * 1000) / 1000);
    }
  }

  return meta;
}

module.exports = { parseAudioMeta, MAX_PEAKS };
