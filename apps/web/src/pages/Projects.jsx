import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Columns3, List, Plus, AudioLines } from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Page } from "../components/layout/AppShell";
import { AvatarStack } from "../components/ui/Avatar";
import { StageBadge } from "../components/ui/Stage";
import { EmptyState, ErrorNote, PageHeader, SkeletonBlock } from "../components/ui/States";
import CreateProjectModal from "../components/projects/CreateProjectModal";
import { STAGES, plural, timeAgo } from "../lib/format";

const OWNERSHIP = [
  { id: "all", label: "Todos" },
  { id: "mine", label: "Criados por mim" },
  { id: "shared", label: "Compartilhados comigo" },
];

function teamOf(project) {
  const members = (project.members || []).filter((m) => m.status === "accepted" && m.role !== "owner").map((m) => m.user);
  return [project.owner, ...members].filter(Boolean);
}

function lastActivity(project) {
  const file = project.files?.[0];
  if (!file) return "Sem áudio ainda";
  return `${file.versions?.[0]?.version || "v1"} por ${file.uploader?.name?.split(" ")[0] || "alguém"} · ${timeAgo(file.createdAt)}`;
}

function Card({ project, mine, onMove, dragProps = {}, innerRef, dragging }) {
  const versions = project._count?.files || 0;
  return (
    <div
      ref={innerRef}
      {...dragProps}
      className={`relative flex flex-col gap-3 rounded-[14px] border bg-th-surface p-4 transition ${
        dragging ? "border-th-accent shadow-2xl" : "border-th-line hover:border-th-hover"
      }`}
    >
      <div className="flex items-start gap-2">
        <Link to={`/projects/${project.id}`} className="min-w-0 flex-1 text-[15px] font-semibold text-th-text no-underline after:absolute after:inset-0 hover:text-th-text">
          {project.name}
        </Link>
        {mine && <span className="rounded-full bg-th-raised px-2 py-0.5 text-[11px] font-semibold text-th-lilac">Seu</span>}
      </div>
      <p className="text-[13px] text-th-muted">{lastActivity(project)}</p>
      {Array.isArray(project.tags) && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-md bg-th-raised px-2 py-0.5 text-xs text-th-text2">
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <AvatarStack users={teamOf(project)} />
        <span className="ml-auto flex items-center gap-1 text-xs text-th-muted">
          <AudioLines size={14} aria-hidden="true" />
          {versions ? plural(versions, "versão", "versões") : "sem áudio"}
        </span>
      </div>
      {mine && (
        <label className="relative z-10 flex items-center gap-2 text-xs text-th-muted">
          <span>Etapa</span>
          <select
            value={project.status}
            onChange={(event) => onMove(project, event.target.value)}
            className="min-h-[32px] flex-1 rounded-lg border border-th-line bg-th-bg px-2 text-xs text-th-text2"
          >
            {STAGES.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("board");
  const [ownership, setOwnership] = useState("all");
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [createStatus, setCreateStatus] = useState(params.get("novo") ? "idea" : null);

  async function load() {
    try {
      const query = selectedTag ? `?tags=${encodeURIComponent(selectedTag)}` : "";
      setProjects(await apiRequest(`/projects${query}`));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [selectedTag]);

  useEffect(() => {
    apiRequest("/projects/tags").then(setTags).catch(() => setTags([]));
  }, []);

  useEffect(() => {
    if (params.get("novo")) setCreateStatus("idea");
  }, [params]);

  function closeCreate() {
    setCreateStatus(null);
    if (params.get("novo")) setParams({}, { replace: true });
  }

  const visible = useMemo(() => {
    if (!projects) return [];
    return projects.filter((project) =>
      ownership === "mine" ? project.ownerId === user?.id : ownership === "shared" ? project.ownerId !== user?.id : true
    );
  }, [projects, ownership, user]);

  const columns = useMemo(
    () => Object.fromEntries(STAGES.map((stage) => [stage.id, visible.filter((project) => project.status === stage.id)])),
    [visible]
  );

  async function persist(list, status) {
    await Promise.all(
      list
        .filter((project) => project.ownerId === user?.id)
        .map((project, index) => apiRequest(`/projects/${project.id}/order`, { method: "PUT", body: { order: index + 1, status } }))
    );
  }

  async function handleDragEnd({ source, destination }) {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const next = Object.fromEntries(Object.entries(columns).map(([key, list]) => [key, [...list]]));
    const [moved] = next[source.droppableId].splice(source.index, 1);
    next[destination.droppableId].splice(destination.index, 0, { ...moved, status: destination.droppableId });
    setProjects((current) => current.map((p) => (p.id === moved.id ? { ...p, status: destination.droppableId } : p)));
    try {
      await persist(next[destination.droppableId], destination.droppableId);
      if (source.droppableId !== destination.droppableId) await persist(next[source.droppableId], source.droppableId);
    } catch (err) {
      setError(err.message);
    }
    load();
  }

  async function moveTo(project, status) {
    setProjects((current) => current.map((p) => (p.id === project.id ? { ...p, status } : p)));
    try {
      await apiRequest(`/projects/${project.id}/order`, { method: "PUT", body: { order: 0, status } });
    } catch (err) {
      setError(err.message);
    }
    load();
  }

  return (
    <Page wide>
      <PageHeader
        title="Meus projetos"
        subtitle="Cada coluna é uma etapa da faixa. Arraste o card quando ela avançar."
        actions={
          <>
            <div role="group" aria-label="Visualização" className="flex rounded-[10px] border border-th-line p-1">
              {[
                ["board", "Quadro", Columns3],
                ["list", "Lista", List],
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => setView(id)}
                  className={`flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-sm ${
                    view === id ? "bg-th-raised font-semibold text-white" : "text-th-text2"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" /> {label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setCreateStatus("idea")} className="btn-primary">
              <Plus size={18} aria-hidden="true" /> Novo projeto
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {OWNERSHIP.map((option) => (
          <button key={option.id} type="button" className="chip" aria-pressed={ownership === option.id} onClick={() => setOwnership(option.id)}>
            {option.label}
          </button>
        ))}
        {tags.length > 0 && (
          <>
            <span className="mx-2 text-sm text-th-muted">Tags:</span>
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="chip"
                aria-pressed={selectedTag === tag}
                onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
              >
                {tag}
              </button>
            ))}
          </>
        )}
      </div>

      <ErrorNote>{error}</ErrorNote>

      {!projects && <SkeletonBlock className="h-80" />}

      {projects && projects.length === 0 && (
        <EmptyState
          icon={Columns3}
          title="Nenhum projeto ainda"
          text="Crie o primeiro: dê um nome, escolha o gênero e depois convide quem vai colaborar."
          action={
            <button type="button" onClick={() => setCreateStatus("idea")} className="btn-primary">
              Criar projeto
            </button>
          }
        />
      )}

      {projects && projects.length > 0 && view === "board" && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 xl:grid xl:grid-cols-4 xl:overflow-visible">
            {STAGES.map((stage) => (
              <section key={stage.id} aria-label={stage.label} className="flex w-[290px] flex-none snap-start flex-col gap-3 xl:w-auto">
                <header className="flex items-center gap-2 px-1">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />
                  <h2 className="text-sm font-semibold">{stage.label}</h2>
                  <span className="text-sm text-th-muted">{columns[stage.id].length}</span>
                  <span className="ml-auto text-xs text-th-muted">{stage.hint}</span>
                </header>
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex min-h-[140px] flex-col gap-3 rounded-2xl p-2 transition ${
                        snapshot.isDraggingOver ? "bg-th-surface" : "bg-th-sidebar/60"
                      }`}
                    >
                      {columns[stage.id].map((project, index) => {
                        const mine = project.ownerId === user?.id;
                        return (
                          <Draggable key={project.id} draggableId={project.id} index={index} isDragDisabled={!mine}>
                            {(drag, dragSnapshot) => (
                              <Card
                                project={project}
                                mine={mine}
                                onMove={moveTo}
                                innerRef={drag.innerRef}
                                dragProps={{ ...drag.draggableProps, ...drag.dragHandleProps }}
                                dragging={dragSnapshot.isDragging}
                              />
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {stage.id === "idea" && (
                        <button type="button" onClick={() => setCreateStatus("idea")} className="btn-ghost justify-start border border-dashed border-th-line2">
                          <Plus size={16} aria-hidden="true" /> Nova ideia
                        </button>
                      )}
                    </div>
                  )}
                </Droppable>
              </section>
            ))}
          </div>
        </DragDropContext>
      )}

      {projects && projects.length > 0 && view === "list" && (
        <div className="overflow-x-auto rounded-2xl border border-th-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-th-sidebar text-xs uppercase tracking-wider text-th-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Projeto</th>
                <th scope="col" className="px-4 py-3 font-semibold">Etapa</th>
                <th scope="col" className="px-4 py-3 font-semibold">Última atividade</th>
                <th scope="col" className="px-4 py-3 font-semibold">Equipe</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((project) => (
                <tr key={project.id} className="border-t border-th-line hover:bg-th-surface">
                  <td className="px-4 py-3">
                    <Link to={`/projects/${project.id}`} className="font-semibold text-th-text">
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StageBadge status={project.status} />
                  </td>
                  <td className="px-4 py-3 text-th-muted">{lastActivity(project)}</td>
                  <td className="px-4 py-3">
                    <AvatarStack users={teamOf(project)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateProjectModal open={Boolean(createStatus)} defaultStatus={createStatus || "idea"} onClose={closeCreate} onCreated={load} />
    </Page>
  );
}
