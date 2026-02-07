import { Link } from "react-router-dom";
import { Users, Pencil, Play, Pause, Music2, Info } from "lucide-react";

function ProjectCard({
  project,
  onPlay,
  onPartner,
  onEdit,
  onHistory,
  onTagClick,
  isPlaying,
  statusLabel,
  hasAudio,
}) {

  return (
  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-brand-darkOutline dark:bg-brand-darkSecondary">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent/30">
            <Music2 size={18} className="text-brand-primary" />
          </div>
          <div>
            <Link to={`/projects/${project.id}`} className="text-sm font-semibold text-brand-primary">
              {project.name}
            </Link>
            <p className="text-xs text-gray-500 line-clamp-1">
              {project.description || "Sem descrição"}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-brand-accent/20 px-2 py-1 text-[10px] text-brand-primary">
          {statusLabel || project.status}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
        {(project.tags || []).map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onTagClick?.(tag)}
            className="rounded-full bg-brand-accent/20 px-2 py-1 text-xs text-brand-primary hover:bg-brand-accent/40"
          >
            #{tag}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-secondary" type="button" onClick={() => hasAudio && onPlay(project)} disabled={!hasAudio}>
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {hasAudio ? "Play" : "Sem áudio"}
        </button>
        <button className="btn-secondary" type="button" onClick={() => onPartner(project)}>
          <Users size={16} />
          Parceiros
        </button>
        <button className="btn-secondary" type="button" onClick={() => onEdit(project)}>
          <Pencil size={16} />
          Editar
        </button>
        <button className="btn-secondary" type="button" onClick={() => onHistory(project)}>
          <Info size={16} />
          Histórico
        </button>
      </div>
    </div>
  );
}

export default ProjectCard;
