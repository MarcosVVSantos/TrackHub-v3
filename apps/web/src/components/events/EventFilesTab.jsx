import { useEffect, useRef, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { apiRequest, apiUpload } from "../../api/client";
import { EmptyState, ErrorNote, SkeletonBlock } from "../ui/States";
import { timeAgo } from "../../lib/format";

function extOf(name = "") {
  const match = /\.([a-z0-9]{1,5})$/i.exec(name);
  return match ? match[1].toUpperCase() : "ARQ";
}

function sizeLabel(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1048576) return `${(value / 1048576).toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

// Arquivos do evento (flyer, rider, contrato, instrumentais...). Usa as mesmas rotas dos projetos.
export default function EventFilesTab({ eventId, canEdit }) {
  const [files, setFiles] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const input = useRef(null);

  async function load() {
    try {
      setFiles(await apiRequest(`/projects/${eventId}/files`));
    } catch (err) {
      setError(err.message);
      setFiles([]);
    }
  }

  useEffect(() => {
    load();
  }, [eventId]);

  async function upload(file) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await apiUpload(`/projects/${eventId}/files`, form);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <ErrorNote>{error}</ErrorNote>
      {!files && <SkeletonBlock className="h-40" />}
      {files?.length === 0 && (
        <EmptyState icon={FileText} title="Nenhum arquivo ainda" text={canEdit ? "Guarde aqui o flyer em alta, o rider técnico, contratos e instrumentais." : "Quando a equipe enviar arquivos, eles aparecem aqui."} />
      )}
      {files?.length > 0 && (
        <ul className="card p-1.5">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-3.5 rounded-[10px] p-3 hover:bg-th-raised">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[10px] bg-th-raised font-mono text-[11px] font-semibold text-th-lilac">{extOf(file.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{file.name}</span>
                <span className="text-xs text-th-muted">{[sizeLabel(file.sizeBytes), file.uploader?.name, timeAgo(file.createdAt)].filter(Boolean).join(" · ")}</span>
              </span>
              <a href={file.url} target="_blank" rel="noreferrer" className="btn-secondary min-h-[40px] text-sm no-underline">
                Baixar
              </a>
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <>
          <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" className="btn-secondary self-start" disabled={uploading} onClick={() => input.current?.click()}>
            <UploadCloud size={16} aria-hidden="true" /> {uploading ? "Enviando…" : "Enviar arquivo"}
          </button>
          <p className="text-xs text-th-muted">Imagem, áudio ou PDF, até 100 MB.</p>
        </>
      )}
    </div>
  );
}
