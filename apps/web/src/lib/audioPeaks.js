// Calcula a forma de onda (picos de 0 a 1) e a duração de um arquivo de áudio
// direto no navegador, antes do upload. Assim o servidor não precisa processar áudio.
const MAX_BYTES = 80 * 1024 * 1024;

export async function analyzeAudio(file, count = 160) {
  if (!file || !file.type?.startsWith("audio/") || file.size > MAX_BYTES) return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  const context = new AudioCtx();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const channel = buffer.getChannelData(0);
    const block = Math.max(1, Math.floor(channel.length / count));
    const raw = [];
    for (let i = 0; i < count; i += 1) {
      let peak = 0;
      const start = i * block;
      for (let j = start; j < Math.min(start + block, channel.length); j += 4) {
        const value = Math.abs(channel[j]);
        if (value > peak) peak = value;
      }
      raw.push(peak);
    }
    const max = Math.max(...raw, 0.0001);
    return {
      durationSec: Math.round(buffer.duration * 10) / 10,
      peaks: raw.map((value) => Math.round((value / max) * 1000) / 1000),
    };
  } catch {
    return null;
  } finally {
    context.close?.();
  }
}
