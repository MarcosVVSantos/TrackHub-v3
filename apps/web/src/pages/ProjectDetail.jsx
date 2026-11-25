import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Globe, ImagePlus, ListPlus, Lock, Pencil, UploadCloud } from "lucide-react";
import { apiRequest, apiUpload } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Page } from "../components/layout/AppShell";
import { AvatarStack } from "../components/ui/Avatar";
import { EmptyState, ErrorNote, SkeletonBlock } from "../components/ui/States";
import TrackPanel, { versionOf } from "../components/project/TrackPanel";
import TasksTab from "../components/project/TasksTab";
import TeamTab from "../components/project/TeamTab";
import AgendaTab from "../components/project/AgendaTab";
import HistoryTab from "../components/project/HistoryTab";
import EditProjectModal from "../components/project/EditProjectModal";
import SaveToPlaylistModal from "../components/project/SaveToPlaylistModal";
import { analyzeAudio } from "../lib/audioPeaks";
import { track } from "../lib/analytics";
import { STAGES, stageIndex, stageOf, timeAgo, formatTime } from "../lib/format";

const TABS = [
  { id: "faixa", label: "Faixa" },
  { id: "tarefas", label: "Tarefas" },
  { id: "equipe", label: "Equipe" },
  { id: "agenda", label: "Agenda" },
  { id: "historico", label: "Histórico" },
];

// O que sugerir como próximo passo, de acordo com a etapa e o que já existe no projeto.
function nextStep(project, audioFiles, openTasks) {
  if (audioFiles.length === 0) return "Envie a primeira versão da faixa para a equipe ouvir.";
  if (openTasks > 0) return `Ainda há ${openTasks} ${openTasks === 1 ? "tarefa aberta" : "tarefas abertas"}.`;
  const stage = stageIndex(project.status);
  if (stage < STAGES.length - 1) return `Quando estiver pronto, avance para ${STAGES[stage + 1].label}.`;
  if (!project.isPublic) return "Faixa finalizada! Envie uma capa e publique para a comunidade ouvir.";
  return "Faixa publicada. Compartilhe e acompanhe em Desempenho.";
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth() || {};
  const [params, setParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState("");
  const [version, setVersion] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const fileInput = useRef(null);
  const coverInput = useRef(null);

  const tab = TABS.some((item) => item.id === params.get("tab")) ? params.get("tab") : "faixa";
  const fileParam = params.get("file");

  async function load() {
    try {
      setProject(await apiRequest(`/projects/${id}`));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    setProject(null);
    load();
  }, [id]);

  function setTab(next) {
    const copy = new URLSearchParams(params);
    copy.set("tab", next);
    setParams(copy, { replace: true });
  }

  function selectFile(fileId) {
    const copy = new URLSearchParams(params);
    copy.set("file", fileId);
    setParams(copy, { replace: true });
  }

  const isOwner = project && user?.id === project.ownerId;
  // "public": você não participa, mas o projeto é público (só a faixa, sem tarefas/agenda/equipe).
  const isVisitor = project?.access === "public";
  const currentMember = project?.members?.find((member) => member.userId === user?.id);
  const canEdit = isOwner || currentMember?.role === "editor";
  const audioFiles = useMemo(() => (project?.files || []).filter((file) => file.type?.startsWith("audio/")), [project]);
  const otherFiles = useMemo(() => (project?.files || []).filter((file) => !file.type?.startsWith("audio/")), [project]);
  const team = useMemo(() => {
    if (!project) return [];
    const people = [project.owner, ...(project.members || []).filter((m) => m.status === "accepted").map((m) => m.user)].filter(Boolean);
    return people.filter((person, index) => people.findIndex((other) => other.id === person.id) === index);
  }, [project]);
  const suggestedVersion = `v${audioFiles.length + 1}`;
  const publicTrack = project?.tracks?.find((item) => item.isPublic);

  async function upload(file) {
    if (!file) return;
    setError("");
    setNotice("");
    const tag = version.trim() || suggestedVersion;
    try {
      setUploading("Analisando o áudio…");
      // A onda é calculada aqui no navegador, assim o servidor não precisa decodificar o áudio.
      const meta = file.type.startsWith("audio/") ? await analyzeAudio(file) : null;
      setUploading("Enviando…");
      const form = new FormData();
      form.append("file", file);
      form.append("version", tag);
      if (meta) {
        form.append("durationSec", String(meta.durationSec));
        form.append("peaks", JSON.stringify(meta.peaks));
      }
      const created = await apiUpload(`/projects/${id}/files`, form);
      track("arquivo_enviado", { tipo: file.type, versao: tag });
      setVersion("");
      setNotice(`${tag} enviada. A equipe foi avisada.`);
      await load();
      if (created?.id && file.type.startsWith("audio/")) selectFile(created.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function uploadCover(file) {
    if (!file) return;
    setError("");
    try {
      const form = new FormData();
      form.append("cover", file);
      const data = await apiUpload(`/projects/${id}/cover`, form);
      setProject((prev) => ({ ...prev, coverUrl: data.coverUrl }));
    } catch (err) {
      setError(err.message);
    } finally {
      if (coverInput.current) coverInput.current.value = "";
    }
  }

  async function update(body) {
    setError("");
    try {
      const updated = await apiRequest(`/projects/${id}`, { method: "PUT", body });
      setProject((prev) => ({ ...prev, ...updated }));
      if (body.status) load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!project) {
    return (
      <Page>
        {error ? (
          <EmptyState title="Não deu para abrir o projeto" text={error} action={<Link to="/projects" className="btn-secondary">Voltar para projetos</Link>} />
        ) : (
          <div className="flex flex-col gap-4">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-64" />
          </div>
        )}
      </Page>
    );
  }

  const stage = stageOf(project.status);
  const current = stageIndex(project.status);
  const openTasks = (project.tasks || []).filter((task) => !task.done).length;

  return (
    <Page wide>
      {isVisitor ? (
        <Link to={`/profile/${project.ownerId}`} className="-mb-4 inline-flex min-h-[44px] self-start items-center gap-2 text-sm text-th-muted hover:text-th-text">
          <ArrowLeft size={16} aria-hidden="true" /> Perfil de {project.owner?.name || "artista"}
        </Link>
      ) : (
        <Link to="/projects" className="-mb-4 inline-flex min-h-[44px] self-start items-center gap-2 text-sm text-th-muted hover:text-th-text">
          <ArrowLeft size={16} aria-hidden="true" /> Meus projetos
        </Link>
      )}

      {/* Cabeçalho */}
      <header className="flex flex-col gap-5 md:flex-row md:items-start">
        <div className="relative h-28 w-28 flex-none overflow-hidden rounded-2xl border border-th-line bg-th-raised">
          {project.coverUrl ? (
            <img src={project.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-th-muted">Sem capa</div>
          )}
          {isOwner && (
            <>
              <input ref={coverInput} type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(event) => uploadCover(event.target.files?.[0])} aria-label="Enviar capa" tabIndex={-1} />
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                className="absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                aria-label={project.coverUrl ? "Trocar capa" : "Enviar capa"}
              >
                <ImagePlus size={16} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow" style={{ color: stage.color }}>
            {stage.label}
          </p>
          <h1 className="mt-1 break-words text-[28px] font-semibold leading-tight">{project.name}</h1>
          <p className="mt-1 text-sm text-th-muted">
            {[project.owner?.name && `de ${project.owner.name}`, project.bpm && `${project.bpm} BPM`, ...(project.tags || [])].filter(Boolean).join(" · ")}
          </p>
          {project.description && <p className="mt-2 max-w-2xl text-sm text-th-text2">{project.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <AvatarStack users={team} />
            <span className="inline-flex items-center gap-1.5 text-xs text-th-muted">
              {project.isPublic ? <Globe size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
              {project.isPublic ? "Público" : "Privado"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {publicTrack && (
            <button type="button" className="btn-secondary" onClick={() => setPlaylistOpen(true)}>
              <ListPlus size={16} aria-hidden="true" /> Salvar em playlist
            </button>
          )}
          {isOwner && (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (!project.isPublic && !project.coverUrl) return setError("Envie uma capa antes de publicar o projeto.");
                  return update({ isPublic: !project.isPublic });
                }}
              >
                {project.isPublic ? <Lock size={16} aria-hidden="true" /> : <Globe size={16} aria-hidden="true" />}
                {project.isPublic ? "Tornar privado" : "Publicar"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditOpen(true)}>
                <Pencil size={16} aria-hidden="true" /> Editar
              </button>
            </>
          )}
        </div>
      </header>

      {/* Etapas */}
      <nav aria-label="Etapa da faixa">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STAGES.map((item, index) => {
            const done = index < current;
            const active = index === current;
            const content = (
              <>
                <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: active || done ? item.color : undefined }}>
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px]"
                    style={{ borderColor: item.color, background: done || active ? item.color : "transparent", color: "#141217" }}
                  >
                    {done ? <Check size={12} /> : index + 1}
                  </span>
                  {item.label}
                </span>
                <span className="mt-1 block text-xs text-th-muted">{item.hint}</span>
              </>
            );
            const base = `block h-full w-full rounded-xl border px-4 py-3 text-left ${active ? "border-th-line2 bg-th-surface" : "border-th-line"}`;
            return (
              <li key={item.id}>
                {isOwner && !active ? (
                  <button type="button" className={`${base} hover:border-th-hover`} onClick={() => update({ status: item.id })} aria-label={`Mover para ${item.label}`}>
                    {content}
                  </button>
                ) : (
                  <div className={base} aria-current={active ? "step" : undefined}>
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Abas (visitante de projeto público só vê a faixa) */}
      {!isVisitor && (
      <div role="tablist" aria-label="Seções do projeto" className="-mb-2 flex gap-1 overflow-x-auto border-b border-th-line">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            onClick={() => setTab(item.id)}
            className={`-mb-px min-h-[44px] whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition ${
              tab === item.id ? "border-th-lilac text-th-text" : "border-transparent text-th-muted hover:text-th-text"
            }`}
          >
            {item.label}
            {item.id === "tarefas" && openTasks > 0 && <span className="ml-1.5 text-xs text-th-muted">{openTasks}</span>}
          </button>
        ))}
      </div>
      )}

      <ErrorNote>{error}</ErrorNote>
      {notice && (
        <p role="status" className="text-sm text-stage-finished">
          {notice}
        </p>
      )}

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {(tab === "faixa" || isVisitor) && (
          <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
            <div className="flex min-w-0 flex-col gap-5">
              {audioFiles.length ? (
                <TrackPanel
                  project={project}
                  files={audioFiles}
                  fileId={fileParam}
                  onSelectFile={selectFile}
                  currentUser={user}
                  isOwner={isOwner}
                  canComment={!isVisitor}
                />
              ) : (
                <EmptyState icon={UploadCloud} title="Nenhuma versão ainda" text={canEdit ? "Envie a primeira versão: um áudio de referência, uma guia ou o beat." : "Quando a equipe enviar uma versão, ela aparece aqui."} />
              )}

              {otherFiles.length > 0 && (
                <section className="card" aria-labelledby="arquivos">
                  <h2 id="arquivos" className="mb-3 font-semibold">
                    Outros arquivos
                  </h2>
                  <ul className="flex flex-col gap-2 text-sm">
                    {otherFiles.map((file) => (
                      <li key={file.id} className="flex items-center gap-3">
                        <a href={file.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-th-link underline-offset-2 hover:underline">
                          {file.name}
                        </a>
                        <span className="text-xs text-th-muted">
                          {versionOf(file)} · {timeAgo(file.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside className="flex flex-col gap-5">
              {isVisitor ? (
                <section className="card" aria-labelledby="sobre">
                  <h2 id="sobre" className="eyebrow">
                    Projeto de {project.owner?.name}
                  </h2>
                  <p className="mt-2 text-sm text-th-text2">Você está vendo a versão mais recente publicada. Quer colaborar? Mande uma mensagem para o artista.</p>
                  <Link to={`/profile/${project.ownerId}`} className="btn-secondary mt-4 w-full">
                    Ver perfil
                  </Link>
                </section>
              ) : (
              <section className="card" aria-labelledby="proximo">
                <h2 id="proximo" className="eyebrow">
                  Próximo passo
                </h2>
                <p className="mt-2 text-sm text-th-text2">{nextStep(project, audioFiles, openTasks)}</p>
              </section>
              )}

              {canEdit && (
                <section className="card flex flex-col gap-3" aria-labelledby="enviar">
                  <h2 id="enviar" className="font-semibold">
                    Enviar nova versão
                  </h2>
                  <div>
                    <label htmlFor="up-version" className="label">
                      Nome da versão
                    </label>
                    <input id="up-version" className="input" maxLength={20} placeholder={suggestedVersion} value={version} onChange={(event) => setVersion(event.target.value)} />
                  </div>
                  <input ref={fileInput} type="file" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => upload(event.target.files?.[0])} />
                  <button type="button" className="btn-primary" disabled={Boolean(uploading)} onClick={() => fileInput.current?.click()}>
                    <UploadCloud size={16} aria-hidden="true" />
                    {uploading || "Escolher arquivo"}
                  </button>
                  <p className="text-xs text-th-muted">Áudio (MP3, WAV, FLAC, M4A), imagem ou PDF.</p>
                </section>
              )}

              {!isVisitor && audioFiles.length > 0 && (
                <section className="card p-0" aria-labelledby="versoes">
                  <h2 id="versoes" className="border-b border-th-line px-5 py-4 font-semibold">
                    Histórico de versões
                  </h2>
                  <ul>
                    {audioFiles.map((file) => (
                      <li key={file.id}>
                        <button
                          type="button"
                          onClick={() => selectFile(file.id)}
                          className={`flex w-full items-center gap-3 border-b border-th-line px-5 py-3 text-left last:border-0 hover:bg-th-raised ${
                            (fileParam || audioFiles[0].id) === file.id ? "bg-th-raised" : ""
                          }`}
                        >
                          <span className="w-10 text-sm font-semibold">{versionOf(file)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{file.uploader?.name}</span>
                            <span className="text-xs text-th-muted">
                              {timeAgo(file.createdAt)}
                              {file.durationSec ? ` · ${formatTime(file.durationSec)}` : ""}
                            </span>
                          </span>
                          {file._count?.comments > 0 && <span className="text-xs text-th-muted">{file._count.comments} coment.</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        )}
        {!isVisitor && tab === "tarefas" && <TasksTab project={project} team={team} canEdit={canEdit} onChange={load} />}
        {!isVisitor && tab === "equipe" && <TeamTab project={project} currentUser={user} isOwner={isOwner} currentMember={currentMember} onChange={load} />}
        {!isVisitor && tab === "agenda" && <AgendaTab project={project} team={team} canEdit={canEdit} onChange={load} />}
        {!isVisitor && tab === "historico" && <HistoryTab project={project} onComment={load} />}
      </div>

      <EditProjectModal open={editOpen} project={project} onClose={() => setEditOpen(false)} onSaved={(updated) => setProject((prev) => ({ ...prev, ...updated }))} />
      {publicTrack && <SaveToPlaylistModal open={playlistOpen} onClose={() => setPlaylistOpen(false)} trackId={publicTrack.id} />}
    </Page>
  );
}
