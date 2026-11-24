// Descobre o tipo real do arquivo pelos primeiros bytes (assinatura), sem confiar
// no nome nem no Content-Type enviado pelo navegador, que podem ser forjados.

function startsWith(buffer, bytes, offset = 0) {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

function ascii(text) {
  return [...text].map((char) => char.charCodeAt(0));
}

const SIGNATURES = [
  { mime: "image/png", ext: ".png", kind: "image", test: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { mime: "image/jpeg", ext: ".jpg", kind: "image", test: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  { mime: "image/webp", ext: ".webp", kind: "image", test: (b) => startsWith(b, ascii("RIFF")) && startsWith(b, ascii("WEBP"), 8) },
  { mime: "audio/wav", ext: ".wav", kind: "audio", test: (b) => startsWith(b, ascii("RIFF")) && startsWith(b, ascii("WAVE"), 8) },
  { mime: "audio/flac", ext: ".flac", kind: "audio", test: (b) => startsWith(b, ascii("fLaC")) },
  { mime: "audio/ogg", ext: ".ogg", kind: "audio", test: (b) => startsWith(b, ascii("OggS")) },
  { mime: "audio/aiff", ext: ".aiff", kind: "audio", test: (b) => startsWith(b, ascii("FORM")) && (startsWith(b, ascii("AIFF"), 8) || startsWith(b, ascii("AIFC"), 8)) },
  { mime: "audio/mp4", ext: ".m4a", kind: "audio", test: (b) => startsWith(b, ascii("ftyp"), 4) && (startsWith(b, ascii("M4A"), 8) || startsWith(b, ascii("mp4"), 8) || startsWith(b, ascii("isom"), 8)) },
  { mime: "audio/mpeg", ext: ".mp3", kind: "audio", test: (b) => startsWith(b, ascii("ID3")) || (b.length > 1 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && (b[1] & 0x06) !== 0) },
  { mime: "audio/aac", ext: ".aac", kind: "audio", test: (b) => b.length > 1 && b[0] === 0xff && (b[1] & 0xf6) === 0xf0 },
  { mime: "audio/midi", ext: ".mid", kind: "project", test: (b) => startsWith(b, ascii("MThd")) },
  { mime: "application/pdf", ext: ".pdf", kind: "document", test: (b) => startsWith(b, ascii("%PDF-")) },
];

// Arquivos de projeto de DAW e pacotes: sem assinatura confiável, aceitos só por extensão
// e sempre servidos como download (nunca abertos pelo navegador).
const DOWNLOAD_ONLY_EXTENSIONS = new Set([".zip", ".rar", ".7z", ".flp", ".als", ".rpp", ".ptx", ".logicx", ".cpr", ".song", ".bwproject"]);

function extensionOf(filename = "") {
  const match = /\.[a-z0-9]{1,10}$/i.exec(filename);
  return match ? match[0].toLowerCase() : "";
}

function detectFileType(buffer, originalname) {
  if (!buffer || !buffer.length) return null;

  const signature = SIGNATURES.find((item) => item.test(buffer));
  if (signature) {
    return { mime: signature.mime, ext: signature.ext, kind: signature.kind, download: false };
  }

  const ext = extensionOf(originalname);
  if (DOWNLOAD_ONLY_EXTENSIONS.has(ext)) {
    return { mime: "application/octet-stream", ext, kind: "project", download: true };
  }

  return null;
}

function invalidFile(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "UPLOAD_REJECTED";
  return error;
}

function validateImage(file) {
  const type = detectFileType(file?.buffer, file?.originalname);
  if (!type || type.kind !== "image") {
    throw invalidFile("Envie uma imagem PNG, JPG ou WEBP válida");
  }
  return type;
}

function validateProjectFile(file) {
  if (!file) throw invalidFile("Selecione um arquivo");
  const type = detectFileType(file.buffer, file.originalname);
  if (!type) {
    throw invalidFile("Tipo de arquivo não suportado. Envie áudio, imagem, PDF, MIDI, ZIP ou projeto de DAW.");
  }
  return type;
}

module.exports = { detectFileType, validateImage, validateProjectFile, DOWNLOAD_ONLY_EXTENSIONS };
