import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, getAccessToken, API_URL } from "../api/client";
import Skeleton from "../components/Skeleton";
import { MessageSquare, UploadCloud, CheckCircle, ArrowLeft } from "lucide-react";

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

  async function handleUpload(event) {
    event.preventDefault();
    if (!file) return;
    const token = getAccessToken();
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("version", version);

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
    setVersion("v1");
    setUploading(false);
    loadProject();
  }

  async function handleTask(event) {
    event.preventDefault();
    const token = getAccessToken();
    await apiRequest(`/projects/${id}/tasks`, { method: "POST", body: taskForm, token });
    setTaskForm({ title: "", description: "", flag: "none" });
    loadProject();
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
        <h2 className="text-xl font-semibold text-brand-primary">{project.name}</h2>
        <p className="mt-2 text-sm text-gray-500">{project.description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-400">
          {project.tags?.map((tag) => (
            <span key={tag} className="rounded-full bg-brand-accent/20 px-2 py-1">
              #{tag}
            </span>
          ))}
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
          <form className="mt-3 space-y-3" onSubmit={handleUpload}>
            <input
              className="input"
              type="file"
              onChange={(event) => setFile(event.target.files[0])}
              required
            />
            <input
              className="input"
              placeholder="Versão (ex: v2)"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
            />
            <button className="btn-primary" type="submit" disabled={uploading}>
              <UploadCloud size={16} />
              {uploading ? "Enviando..." : "Upload"}
            </button>
          </form>
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
