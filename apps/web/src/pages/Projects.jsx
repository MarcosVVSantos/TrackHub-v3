import { useEffect, useMemo, useState } from "react";
import { API_URL, apiRequest, getAccessToken } from "../api/client";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import Skeleton from "../components/Skeleton";
import { KanbanSquare, List, Plus } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import CreateProjectModal from "../components/projects/CreateProjectModal";
import TagFilter from "../components/projects/TagFilter";
import ProjectCard from "../components/projects/ProjectCard";
import AddPartnerModal from "../components/projects/AddPartnerModal";
import EditProjectModal from "../components/projects/EditProjectModal";
import ProjectHistoryDrawer from "../components/projects/ProjectHistoryDrawer";

const statusLabels = {
  idea: "Ideia",
  in_progress: "Em andamento",
  production: "Produção",
  finished: "Finalizado",
};

function Projects() {
  const [projects, setProjects] = useState(null);
  const [view, setView] = useState("list");
  const [error, setError] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [partnerProject, setPartnerProject] = useState(null);
  const [editProject, setEditProject] = useState(null);
  const [historyProject, setHistoryProject] = useState(null);
  const player = usePlayer();
  const { user } = useAuth();
  const [invites, setInvites] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(false);

  async function loadProjects() {
    try {
      const token = getAccessToken();
      const params = new URLSearchParams();
      if (selectedTags.length) params.set("tags", selectedTags.join(","));
      if (selectedStatus.length) params.set("status", selectedStatus.join(","));
      const data = await apiRequest(`/projects?${params.toString()}`, { token });
      setProjects(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadTags() {
    try {
      const token = getAccessToken();
      const data = await apiRequest("/projects/tags", { token });
      setAvailableTags(data);
    } catch (err) {
      setAvailableTags([]);
    }
  }

  async function loadInvites() {
    try {
      setInviteLoading(true);
      const token = getAccessToken();
      const data = await apiRequest("/projects/invites", { token });
      setInvites(data);
    } catch (err) {
      setInvites([]);
    } finally {
      setInviteLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, [selectedTags, selectedStatus]);

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    loadInvites();
  }, []);

  async function handleInviteAction(inviteId, action) {
    const token = getAccessToken();
    await apiRequest(`/projects/invites/${inviteId}/${action}`, { method: "POST", token });
    loadInvites();
    loadProjects();
  }

  const grouped = useMemo(() => {
    if (!projects) return {};
    return projects.reduce((acc, project) => {
      const status = project.status;
      acc[status] = acc[status] || [];
      acc[status].push(project);
      return acc;
    }, {});
  }, [projects]);

  async function handleDragEnd(result) {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const updated = { ...grouped };
    const sourceList = Array.from(updated[source.droppableId] || []);
    const [moved] = sourceList.splice(source.index, 1);
    const destList = Array.from(updated[destination.droppableId] || []);
    destList.splice(destination.index, 0, moved);
    updated[source.droppableId] = sourceList;
    updated[destination.droppableId] = destList;

    const updates = [];
    updated[destination.droppableId]
      .filter((project) => project.ownerId === user?.id)
      .forEach((project, index) => {
        updates.push(
          apiRequest(`/projects/${project.id}/order`, {
            method: "PUT",
            body: { order: index + 1, status: destination.droppableId },
          })
        );
      });
    if (source.droppableId !== destination.droppableId) {
      updated[source.droppableId]
        .filter((project) => project.ownerId === user?.id)
        .forEach((project, index) => {
          updates.push(
            apiRequest(`/projects/${project.id}/order`, {
              method: "PUT",
              body: { order: index + 1, status: source.droppableId },
            })
          );
        });
    }
    await Promise.all(updates);
    loadProjects();
  }

  function toggleTag(tag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((value) => value !== tag) : [...prev, tag]
    );
  }

  function toggleStatus(status) {
    setSelectedStatus((prev) =>
      prev.includes(status) ? prev.filter((value) => value !== status) : [...prev, status]
    );
  }

  async function handlePlay(project) {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/projects/${project.id}/audio`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Não foi possível reproduzir o áudio");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (player?.current?.id === project.id) {
        player.togglePlay();
        return;
      }
      player?.playTrack({
        id: project.id,
        title: project.name,
        audioUrl: url,
        isObjectUrl: true,
        coverUrl: project.coverUrl,
        projectId: project.id,
        projectName: project.name,
        creatorName: project.owner?.name,
        description: project.description,
        tags: project.tags || [],
        partners: (project.members || []).map((member) => member.user).filter(Boolean),
      });
    } catch (err) {
      setError(err.message);
    }
  }

  function handleTagClick(tag) {
    toggleTag(tag);
  }

  if (error) {
    return <div className="mx-auto max-w-6xl p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-brand-primary">Projetos</h2>
          <p className="text-sm text-gray-500">Crie, organize e colabore com fluidez.</p>
        </div>
        <button className="btn-primary" type="button" onClick={() => setOpenModal(true)}>
          <Plus size={16} />
          Novo projeto
        </button>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-primary">Filtros</p>
            <p className="text-xs text-gray-500">Selecione tags e status.</p>
          </div>
          <div className="flex gap-2">
            <button
              className={view === "list" ? "btn-primary" : "btn-secondary"}
              onClick={() => setView("list")}
            >
              <List size={16} />
              Lista
            </button>
            <button
              className={view === "kanban" ? "btn-primary" : "btn-secondary"}
              onClick={() => setView("kanban")}
            >
              <KanbanSquare size={16} />
              Kanban
            </button>
          </div>
        </div>
        <div className="space-y-3">
          <TagFilter tags={availableTags} selected={selectedTags} onToggle={toggleTag} />
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusLabels).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleStatus(value)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  selectedStatus.includes(value)
                    ? "border-brand-primary bg-brand-accent/20 text-brand-primary"
                    : "border-gray-200 text-gray-500 hover:border-brand-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <div>
          <p className="text-sm font-semibold text-brand-primary">Convites pendentes</p>
          <p className="text-xs text-gray-500">Aceite ou recuse parcerias de projeto.</p>
        </div>
        {inviteLoading ? (
          <p className="text-xs text-gray-400">Carregando convites...</p>
        ) : invites.length === 0 ? (
          <p className="text-xs text-gray-400">Nenhum convite pendente.</p>
        ) : (
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 dark:border-brand-darkOutline"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-brand-text">
                    {invite.project?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-brand-textMuted">
                    Convidado por {invite.invitedBy?.name || "parceiro"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary"
                    onClick={() => handleInviteAction(invite.id, "decline")}
                  >
                    Recusar
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => handleInviteAction(invite.id, "accept")}
                  >
                    Aceitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!projects ? (
        <Skeleton lines={6} />
      ) : view === "list" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onPlay={handlePlay}
              onPartner={setPartnerProject}
              onEdit={setEditProject}
              onHistory={setHistoryProject}
              onTagClick={handleTagClick}
              isPlaying={player?.current?.id === project.id && player?.isPlaying}
              statusLabel={statusLabels[project.status]}
              hasAudio={project.files?.length || project.tracks?.length}
            />
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid gap-4 md:grid-cols-4">
            {Object.entries(statusLabels).map(([status, label]) => (
              <Droppable key={status} droppableId={status}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="card space-y-3"
                  >
                    <h3 className="text-sm font-semibold text-brand-primary">{label}</h3>
                    <div className="flex flex-col gap-3">
                      {(grouped[status] || []).map((project, index) => (
                        <Draggable key={project.id} draggableId={project.id} index={index} isDragDisabled={project.ownerId !== user?.id}>
                          {(dragProvided) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className="rounded-xl border border-gray-100 bg-white p-4 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-brand-darkOutline dark:bg-brand-darkSecondary"
                            >
                              <ProjectCard
                                project={project}
                                onPlay={handlePlay}
                                onPartner={setPartnerProject}
                                onEdit={setEditProject}
                                onHistory={setHistoryProject}
                                onTagClick={handleTagClick}
                                isPlaying={player?.current?.id === project.id && player?.isPlaying}
                                statusLabel={statusLabels[project.status]}
                                hasAudio={project.files?.length || project.tracks?.length}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}
      <CreateProjectModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={loadProjects}
        tagsSuggestions={availableTags}
      />
      <EditProjectModal
        open={!!editProject}
        project={editProject}
        onClose={() => setEditProject(null)}
        onUpdated={loadProjects}
        tagsSuggestions={availableTags}
      />
      <AddPartnerModal
        open={!!partnerProject}
        project={partnerProject}
        onClose={() => setPartnerProject(null)}
      />
      <ProjectHistoryDrawer
        open={!!historyProject}
        project={historyProject}
        onClose={() => setHistoryProject(null)}
      />
    </div>
  );
}

export default Projects;
