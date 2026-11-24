import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, Pause, Play, Search, UserPlus, Users } from "lucide-react";
import { apiRequest } from "../api/client";
import { Page } from "../components/layout/AppShell";
import { Avatar } from "../components/ui/Avatar";
import Modal from "../components/ui/Modal";
import { EmptyState, ErrorNote, PageHeader, SkeletonBlock } from "../components/ui/States";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { GENRES } from "../components/projects/CreateProjectModal";
import { ROLES, plural } from "../lib/format";

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const player = usePlayer();
  const [query, setQuery] = useState(params.get("q") || "");
  const [role, setRole] = useState("");
  const [genre, setGenre] = useState("");
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState(null);
  const [error, setError] = useState("");
  const [inviting, setInviting] = useState(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setError("");
      try {
        const search = new URLSearchParams({ q: query.trim(), role, genre, open: String(open) });
        setPeople(await apiRequest(`/users/explore?${search}`));
      } catch (err) {
        setError(err.message);
        setPeople([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, role, genre, open]);

  // Vindo do Início ("Convidar") abre direto o convite para aquela pessoa.
  useEffect(() => {
    const target = params.get("convidar");
    if (!target || !people) return;
    const person = people.find((item) => item.id === target);
    if (person) setInviting(person);
    else
      apiRequest(`/profiles/${target}`)
        .then((profile) => setInviting(profile.user || profile))
        .catch(() => {});
  }, [params.get("convidar"), people]);

  function closeInvite() {
    setInviting(null);
    if (params.get("convidar")) {
      const copy = new URLSearchParams(params);
      copy.delete("convidar");
      setParams(copy, { replace: true });
    }
  }

  async function toggleFollow(person) {
    try {
      await apiRequest(`/follows/${person.id}`, { method: person.isFollowing ? "DELETE" : "POST" });
      setPeople((list) =>
        list.map((item) =>
          item.id === person.id ? { ...item, isFollowing: !item.isFollowing, followersCount: item.followersCount + (item.isFollowing ? -1 : 1) } : item
        )
      );
    } catch (err) {
      setError(err.message);
    }
  }

  function playSample(person) {
    const sample = person.sample;
    if (player.current?.id === sample.id) return player.togglePlay();
    return player.playTrack({ id: sample.id, title: sample.title, subtitle: person.name, audioUrl: sample.audioUrl, coverUrl: sample.coverUrl });
  }

  return (
    <Page wide>
      <PageHeader title="Encontrar parceiros" subtitle="Ache quem completa a sua faixa: beat, voz, mix ou letra." />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col gap-6" aria-label="Filtros">
          <div>
            <label htmlFor="ex-q" className="label">
              Buscar
            </label>
            <div className="relative">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
              <input id="ex-q" className="input pl-9" placeholder="Nome, @usuário ou cidade" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
          </div>
          <fieldset>
            <legend className="label">Estou procurando</legend>
            <div className="flex flex-col gap-1">
              {["", ...ROLES].map((item) => (
                <label key={item || "all"} className={`flex min-h-[40px] cursor-pointer items-center gap-3 rounded-lg px-3 text-sm ${role === item ? "bg-th-raised text-th-text" : "text-th-text2 hover:bg-th-raised"}`}>
                  <input type="radio" name="ex-role" className="accent-[#D9B8E3]" checked={role === item} onChange={() => setRole(item)} />
                  {item || "Qualquer função"}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">Gênero</legend>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((item) => (
                <button key={item} type="button" className="chip" aria-pressed={genre === item} onClick={() => setGenre(genre === item ? "" : item)}>
                  {item}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[#D9B8E3]" checked={open} onChange={(event) => setOpen(event.target.checked)} />
            Só quem está aberto a colaborar
          </label>
        </aside>

        <section aria-live="polite" aria-busy={!people}>
          <ErrorNote>{error}</ErrorNote>
          {!people ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((key) => (
                <SkeletonBlock key={key} className="h-52" />
              ))}
            </div>
          ) : people.length === 0 ? (
            <EmptyState icon={Users} title="Ninguém com esses filtros" text="Tente tirar um filtro ou buscar por outro nome." />
          ) : (
            <>
              <p className="mb-3 text-sm text-th-muted">{plural(people.length, "pessoa encontrada", "pessoas encontradas")}</p>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {people.map((person) => {
                  const playing = player.current?.id === person.sample?.id && player.isPlaying;
                  return (
                    <li key={person.id} className="card flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <Avatar user={person} size="lg" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{person.name}</p>
                          <p className="truncate text-sm text-th-muted">
                            {[person.role, person.username && `@${person.username}`].filter(Boolean).join(" · ")}
                          </p>
                          {person.city && (
                            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-th-muted">
                              <MapPin size={12} aria-hidden="true" /> {person.city}
                            </p>
                          )}
                        </div>
                      </div>
                      {person.openToCollab && <p className="text-xs font-semibold text-stage-finished">● Aberto a colaborar</p>}
                      {person.genres?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {person.genres.map((item) => (
                            <span key={item} className="rounded-full bg-th-raised px-2.5 py-1 text-xs text-th-text2">
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                      {person.sample && (
                        <button type="button" onClick={() => playSample(person)} className="flex items-center gap-3 rounded-xl bg-th-raised px-3 py-2 text-left hover:bg-th-line2">
                          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-th-text text-th-bg">
                            {playing ? <Pause size={14} fill="currentColor" aria-hidden="true" /> : <Play size={14} fill="currentColor" aria-hidden="true" />}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">
                            <span className="sr-only">{playing ? "Pausar" : "Ouvir"} </span>
                            {person.sample.title}
                          </span>
                        </button>
                      )}
                      <p className="text-xs text-th-muted">{plural(person.followersCount, "seguidor", "seguidores")}</p>
                      <div className="mt-auto flex flex-wrap gap-2">
                        <button type="button" className="btn-primary flex-1" onClick={() => setInviting(person)}>
                          <UserPlus size={16} aria-hidden="true" /> Convidar p/ projeto
                        </button>
                        <Link to={`/profile/${person.id}`} className="btn-secondary">
                          Ver perfil
                        </Link>
                        <button type="button" className="btn-ghost" aria-pressed={person.isFollowing} onClick={() => toggleFollow(person)}>
                          {person.isFollowing ? "Seguindo" : "Seguir"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>

      <InviteToProjectModal person={inviting} onClose={closeInvite} />
    </Page>
  );
}

// Escolhe um dos SEUS projetos e manda o convite para a pessoa.
function InviteToProjectModal({ person, onClose }) {
  const { user } = useAuth() || {};
  const [projects, setProjects] = useState(null);
  const [projectId, setProjectId] = useState("");
  const [role, setRole] = useState("editor");
  const [roleLabel, setRoleLabel] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!person) return;
    setDone("");
    setError("");
    setRoleLabel(person.role || "");
    apiRequest("/projects")
      .then((list) => {
        const result = list.filter((project) => project.ownerId === user?.id);
        setProjects(result);
        setProjectId(result[0]?.id || "");
      })
      .catch((err) => setError(err.message));
  }, [person?.id]);

  async function send(event) {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      await apiRequest(`/projects/${projectId}/invite`, { method: "POST", body: { username: person.username, role, roleLabel } });
      setDone(`Convite enviado para ${person.name}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={Boolean(person)} onClose={onClose} title={`Convidar ${person?.name || ""}`} description="Escolha o projeto e o que a pessoa vai poder fazer.">
      {done ? (
        <div className="flex flex-col gap-4">
          <p role="status" className="text-sm text-stage-finished">
            {done}
          </p>
          <button type="button" className="btn-primary self-end" onClick={onClose}>
            Fechar
          </button>
        </div>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-4">
          {projects && projects.length === 0 ? (
            <p className="text-sm text-th-muted">
              Você ainda não tem projetos. <Link to="/projects?novo=1" className="text-th-link underline">Crie um</Link> primeiro.
            </p>
          ) : (
            <div>
              <label htmlFor="inv-project" className="label">
                Projeto
              </label>
              <select id="inv-project" className="input" value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
                {(projects || []).map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="inv-func" className="label">
              Função na faixa (opcional)
            </label>
            <input id="inv-func" className="input" maxLength={60} value={roleLabel} onChange={(event) => setRoleLabel(event.target.value)} placeholder="Ex: voz, beat, mix" />
          </div>
          <fieldset>
            <legend className="label">Permissão</legend>
            <div className="flex gap-2">
              {[
                ["editor", "Editor"],
                ["viewer", "Ouvinte"],
              ].map(([value, label]) => (
                <button key={value} type="button" className="chip" aria-pressed={role === value} onClick={() => setRole(value)}>
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-th-muted">{role === "editor" ? "Envia versões, cria tarefas e eventos." : "Só ouve e comenta."}</p>
          </fieldset>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={sending || !projectId}>
              {sending ? "Enviando..." : "Enviar convite"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
