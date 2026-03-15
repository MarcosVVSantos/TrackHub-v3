import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, getAccessToken, API_URL } from "../api/client";
import Skeleton from "../components/Skeleton";
import { MessageSquare, UploadCloud, CheckCircle, ArrowLeft, Calendar, Lock, Globe } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [comment, setComment] = useState("");
  const [file, setFile] = useState(null);
  const [version, setVersion] = useState("v1");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", flag: "none" });
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    startsAt: "",
    endsAt: "",
    participantIds: [],
  });
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState("");
  const [editingEventId, setEditingEventId] = useState(null);
  const { user } = useAuth() || {};

  async function loadProject() {
    try {
      const token = getAccessToken();
      const data = await apiRequest(`/projects/${id}`, { token });
      setProject(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadProject();
  }, [id]);

  async function handleComment(event) {
    event.preventDefault();
    const token = getAccessToken();
    setSendingComment(true);
    await apiRequest(`/projects/${id}/comments`, { method: "POST", body: { content: comment }, token });
    setComment("");
    setSendingComment(false);
    loadProject();
  }

  async function handleUpload(selectedFile) {
    if (!selectedFile || uploading) return;
    const token = getAccessToken();
    setUploading(true);
    const formData = new FormData();
    const normalizedVersion = version.trim() || "v1";
    formData.append("file", selectedFile);
    formData.append("version", normalizedVersion);

    const response = await fetch(`${API_URL}/projects/${id}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Erro no upload" }));
      setError(errorData.message);
      setUploading(false);
      return;
    }

    setFile(null);
    setVersion(normalizedVersion);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    loadProject();
  }

  async function handleTask(event) {
    event.preventDefault();
    const token = getAccessToken();
    await apiRequest(`/projects/${id}/tasks`, { method: "POST", body: taskForm, token });
    setTaskForm({ title: "", description: "", flag: "none" });
    loadProject();
  }

  const isOwner = user?.id === project?.ownerId;
  const currentMember = project?.members?.find((member) => member.userId === user?.id);

  async function handleCoverUpload(selectedFile) {
    if (!selectedFile) return;
    setCoverUploading(true);
    setError("");
    const token = getAccessToken();
    const formData = new FormData();
    formData.append("cover", selectedFile);
    const response = await fetch(`${API_URL}/projects/${id}/cover`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: "Erro ao enviar capa" }));
      setError(data.message);
      setCoverUploading(false);
      return;
    }
    const data = await response.json();
    setProject((prev) => ({ ...prev, coverUrl: data.coverUrl }));
    setCoverUploading(false);
  }

  async function handleVisibilityChange(value) {
    if (!isOwner) return;
    setVisibilityLoading(true);
    setError("");
    try {
      const token = getAccessToken();
      const updated = await apiRequest(`/projects/${id}`, {
        method: "PUT",
        body: { isPublic: value },
        token,
      });
      setProject((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      setError(err.message);
    } finally {
      setVisibilityLoading(false);
    }
  }

  async function handleCreateEvent(event) {
    event.preventDefault();
    setEventLoading(true);
    setEventError("");
    try {
      const token = getAccessToken();
      const payload = {
        title: eventForm.title,
        description: eventForm.description,
        startsAt: eventForm.startsAt,
        endsAt: eventForm.endsAt || null,
        participantIds: eventForm.participantIds,
      };
      if (editingEventId) {
        await apiRequest(`/calendar/projects/${id}/events/${editingEventId}`, {
          method: "PUT",
          body: payload,
          token,
        });
      } else {
        await apiRequest(`/calendar/projects/${id}/events`, {
          method: "POST",
          body: payload,
          token,
        });
      }
      setEventForm({ title: "", description: "", startsAt: "", endsAt: "", participantIds: [] });
      setEditingEventId(null);
      loadProject();
    } catch (err) {
      setEventError(err.message);
    } finally {
      setEventLoading(false);
    }
  }

  async function handleCalendarShareInvite(memberId) {
    const token = getAccessToken();
    await apiRequest(`/calendar/projects/${id}/calendar-share`, {
      method: "POST",
      body: { memberId },
      token,
    });
    loadProject();
  }

  async function handleCalendarShareResponse(action) {
    const token = getAccessToken();
    await apiRequest(`/calendar/projects/${id}/calendar-share/${action}`, {
      method: "POST",
      token,
    });
    loadProject();
  }

  async function handleRemovePartner(member) {
    if (!member?.userId) return;
    const confirmed = window.confirm("Remover parceiro do projeto?");
    if (!confirmed) return;
    const token = getAccessToken();
    await apiRequest(`/projects/${id}/partner/${member.userId}`, { method: "DELETE", token });
    loadProject();
  }

  function toggleParticipant(userId) {
    setEventForm((prev) => {
      const exists = prev.participantIds.includes(userId);
      return {
        ...prev,
        participantIds: exists
          ? prev.participantIds.filter((idValue) => idValue !== userId)
          : [...prev.participantIds, userId],
      };
    });
  }

  function startEditEvent(item) {
    setEditingEventId(item.id);
    setEventForm({
      title: item.title || "",
      description: item.description || "",
      startsAt: item.startsAt ? new Date(item.startsAt).toISOString().slice(0, 16) : "",
      endsAt: item.endsAt ? new Date(item.endsAt).toISOString().slice(0, 16) : "",
      participantIds: item.participants?.map((participant) => participant.userId) || [],
    });
  }

  if (error) {
    return <div className="mx-auto max-w-6xl p-6 text-red-500">{error}</div>;
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <Skeleton lines={8} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-sm text-brand-primary hover:text-brand-primary/80"
      >
        <ArrowLeft size={16} />
        Voltar para projetos
      </Link>
      <div className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-brand-primary">{project.name}</h2>
            <p className="text-sm text-gray-500">{project.description}</p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-400">
              {project.tags?.map((tag) => (
                <span key={tag} className="rounded-full bg-brand-accent/20 px-2 py-1">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 dark:border-brand-darkOutline">
                {project.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                {project.isPublic ? "Público" : "Privado"}
              </span>
              {isOwner && (
                <select
                  className="input h-8 text-xs"
                  value={project.isPublic ? "public" : "private"}
                  onChange={(event) => handleVisibilityChange(event.target.value === "public")}
                  disabled={visibilityLoading}
                >
                  <option value="private">Privado</option>
                  <option value="public">Público</option>
                </select>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2">
            <div className="h-32 w-32 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 dark:border-brand-darkOutline dark:bg-brand-darkSecondary">
              {project.coverUrl ? (
                <img src={project.coverUrl} alt={project.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                  Sem capa
                </div>
              )}
            </div>
            {isOwner && (
              <>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(event) => handleCoverUpload(event.target.files[0])}
                />
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                >
                  {coverUploading ? "Enviando..." : "Enviar capa"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="text-sm font-semibold text-brand-primary">Comentários</h3>
          <form className="mt-3 flex gap-2" onSubmit={handleComment}>
            <input
              className="input"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Escreva um comentário"
              required
            />
            <button className="btn-primary" type="submit">
              <MessageSquare size={16} />
              {sendingComment ? "Enviando..." : "Enviar"}
            </button>
          </form>
          <div className="mt-4 space-y-2 text-sm">
            {project.comments?.map((item) => (
              <div key={item.id} className="rounded-lg bg-gray-50 p-3 dark:bg-brand-darkSecondary">
                <p className="font-semibold text-brand-primary">{item.user?.name}</p>
                <p className="text-gray-500">{item.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-brand-primary">Uploads</h3>
          <div className="mt-3 space-y-3">
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (!selected) return;
                setFile(selected);
                handleUpload(selected);
              }}
              required
            />
            <input
              className="input"
              placeholder="Versão (ex: v2)"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
            />
            <button
              className="btn-primary"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <UploadCloud size={16} />
              {uploading ? "Enviando..." : "Upload"}
            </button>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {project.files?.map((item) => (
              <div key={item.id} className="rounded-lg bg-gray-50 p-3 dark:bg-brand-darkSecondary">
                <p className="font-semibold text-brand-primary">{item.name}</p>
                <p className="text-gray-500">{item.type}</p>
                <p className="text-xs text-gray-400">Versões: {item.versions?.length || 0}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="text-sm font-semibold text-brand-primary">Parceiros</h3>
          <div className="mt-3 space-y-2 text-sm">
            {project.members?.filter((member) => member.status === "accepted").map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 dark:border-brand-darkOutline"
              >
                <div>
                  <p className="font-semibold text-gray-700 dark:text-brand-text">
                    {member.user?.name || member.inviteEmail}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-brand-textMuted">
                    {member.roleLabel || "Sem função"} · {member.role}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isOwner && member.userId && member.userId !== user?.id && (
                    <>
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => handleCalendarShareInvite(member.userId)}
                        disabled={member.calendarShareStatus === "pending"}
                      >
                        {member.calendarShareStatus === "accepted"
                          ? "Agenda ativa"
                          : member.calendarShareStatus === "pending"
                            ? "Convite enviado"
                            : "Compartilhar agenda"}
                      </button>
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => handleRemovePartner(member)}
                      >
                        Remover
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {currentMember?.calendarShareStatus === "pending" && !isOwner && (
              <div className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-500 dark:border-brand-darkOutline">
                <p>Convite para agenda compartilhada.</p>
                <div className="mt-2 flex gap-2">
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => handleCalendarShareResponse("decline")}
                  >
                    Recusar
                  </button>
                  <button
                    className="btn-primary"
                    type="button"
                    onClick={() => handleCalendarShareResponse("accept")}
                  >
                    Aceitar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-brand-primary">Agenda do projeto</h3>
            <Calendar size={16} className="text-brand-primary" />
          </div>
          <form className="mt-3 space-y-3" onSubmit={handleCreateEvent}>
            <input
              className="input"
              placeholder="Título do evento"
              value={eventForm.title}
              onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })}
              required
            />
            <input
              className="input"
              type="datetime-local"
              value={eventForm.startsAt}
              onChange={(event) => setEventForm({ ...eventForm, startsAt: event.target.value })}
              required
            />
            <input
              className="input"
              type="datetime-local"
              value={eventForm.endsAt}
              onChange={(event) => setEventForm({ ...eventForm, endsAt: event.target.value })}
            />
            <textarea
              className="input"
              placeholder="Descrição"
              value={eventForm.description}
              onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })}
            />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500">Participantes</p>
              <div className="flex flex-wrap gap-2">
                {project.members?.filter((member) => member.status === "accepted").map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      eventForm.participantIds.includes(member.userId)
                        ? "border-brand-primary bg-brand-accent/20 text-brand-primary"
                        : "border-gray-200 text-gray-500"
                    }`}
                    onClick={() => toggleParticipant(member.userId)}
                  >
                    {member.user?.name || member.inviteEmail}
                  </button>
                ))}
              </div>
            </div>
            {eventError && <p className="text-xs text-rose-500">{eventError}</p>}
            <button className="btn-primary" type="submit" disabled={eventLoading}>
              <CheckCircle size={16} />
              {eventLoading ? "Salvando..." : editingEventId ? "Atualizar" : "Agendar"}
            </button>
          </form>
          <div className="mt-4 space-y-2 text-sm">
            {project.events?.length ? (
              project.events.map((item) => (
                <div key={item.id} className="rounded-lg bg-gray-50 p-3 dark:bg-brand-darkSecondary">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-brand-primary">{item.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(item.startsAt).toLocaleString("pt-BR")}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-brand-primary"
                        onClick={() => startEditEvent(item)}
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                  {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                    {item.participants?.map((participant) => (
                      <span key={participant.id}>@{participant.user?.username || participant.userId}</span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">Nenhum evento agendado.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-brand-primary">Tarefas / Faixas</h3>
        <form className="mt-3 grid gap-2 md:grid-cols-3" onSubmit={handleTask}>
          <input
            className="input"
            placeholder="Título"
            value={taskForm.title}
            onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Descrição"
            value={taskForm.description}
            onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })}
          />
          <select
            className="input"
            value={taskForm.flag}
            onChange={(event) => setTaskForm({ ...taskForm, flag: event.target.value })}
          >
            <option value="none">Normal</option>
            <option value="attention">Atenção</option>
            <option value="blocked">Bloqueado</option>
          </select>
          <button className="btn-primary md:col-span-3" type="submit">
            <CheckCircle size={16} />
            Adicionar tarefa
          </button>
        </form>
        <div className="mt-4 grid gap-2 text-sm">
          {project.tasks?.map((task) => (
            <div key={task.id} className="rounded-lg bg-gray-50 p-3 dark:bg-brand-darkSecondary">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-brand-primary">{task.title}</p>
                {task.flag !== "none" && (
                  <span className="text-xs text-red-500">{task.flag}</span>
                )}
              </div>
              {task.description && <p className="text-gray-500">{task.description}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-brand-primary">Histórico de status</h3>
        <div className="mt-3 grid gap-2 text-sm">
          {project.statusLog?.map((log) => (
            <div key={log.id} className="rounded-lg bg-gray-50 p-3 dark:bg-brand-darkSecondary">
              <span>{log.fromStatus} → {log.toStatus}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProjectDetail;
