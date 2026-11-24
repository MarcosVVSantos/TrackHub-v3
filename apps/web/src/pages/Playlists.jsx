import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Globe, ListMusic, Lock, Pause, Play, Plus, Sparkles } from "lucide-react";
import { apiRequest } from "../api/client";
import { Page } from "../components/layout/AppShell";
import CreatePlaylistModal from "../components/playlists/CreatePlaylistModal";
import { StageBadge } from "../components/ui/Stage";
import { EmptyState, PageHeader, SkeletonBlock } from "../components/ui/States";
import { usePlayer } from "../context/PlayerContext";
import { formatTime, plural, timeAgo } from "../lib/format";

const toPlayer = (item) => ({
  id: item.fileId,
  title: item.title,
  subtitle: `${item.version} · ${item.uploader?.name || ""}`,
  audioUrl: item.url,
  coverUrl: item.coverUrl,
  projectId: item.projectId,
});

export default function Playlists() {
  const player = usePlayer();
  const [auto, setAuto] = useState(null);
  const [mine, setMine] = useState(null);
  const [selected, setSelected] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    const [autoData, mineData] = await Promise.all([apiRequest("/playlists/auto").catch(() => []), apiRequest("/playlists/mine").catch(() => [])]);
    setAuto(autoData);
    setMine(mineData);
    setSelected((current) => current || autoData[0]?.id || null);
  }

  useEffect(() => {
    load();
  }, []);

  const playlist = auto?.find((item) => item.id === selected);
  const queue = playlist?.tracks.map(toPlayer) || [];
  const playingHere = queue.some((item) => item.id === player.current?.id);

  return (
    <Page wide>
      <PageHeader
        title="Playlists"
        subtitle="Ouça as faixas em que você está trabalhando, em sequência."
        actions={
          <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} aria-hidden="true" /> Nova playlist
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <nav aria-label="Biblioteca" className="flex flex-col gap-6">
          <div>
            <p className="eyebrow mb-2">Automáticas</p>
            <ul className="flex flex-col gap-1">
              {(auto || []).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(item.id)}
                    aria-current={selected === item.id ? "true" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${selected === item.id ? "bg-th-raised" : "hover:bg-th-raised"}`}
                  >
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-th-line2 text-th-lilac">
                      <Sparkles size={16} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{item.name}</span>
                      <span className="text-xs text-th-muted">{plural(item.tracks.length, "faixa", "faixas")}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-2">Criadas por você</p>
            {mine === null ? (
              <SkeletonBlock className="h-16" />
            ) : mine.length === 0 ? (
              <p className="px-3 text-sm text-th-muted">Nenhuma ainda.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {mine.map((item) => {
                  const cover = item.tracks?.[0]?.track?.coverUrl;
                  return (
                    <li key={item.id}>
                      <Link to={`/playlists/${item.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-th-raised">
                        <span className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-lg bg-th-line2 text-th-muted">
                          {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <ListMusic size={16} aria-hidden="true" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{item.name}</span>
                          <span className="text-xs text-th-muted">{plural(item._count?.tracks ?? 0, "faixa", "faixas")}</span>
                        </span>
                        {item.isPublic ? <Globe size={14} className="text-th-muted" aria-label="Pública" /> : <Lock size={14} className="text-th-muted" aria-label="Privada" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </nav>

        <section aria-labelledby="pl-title">
          {!auto ? (
            <SkeletonBlock className="h-80" />
          ) : !playlist ? (
            <EmptyState icon={ListMusic} title="Sem playlists" text="Crie projetos e envie versões: elas aparecem aqui automaticamente." />
          ) : (
            <div className="card p-0">
              <div className="flex flex-wrap items-end gap-4 border-b border-th-line p-5">
                <div className="min-w-0 flex-1">
                  <p className="eyebrow">Playlist automática</p>
                  <h2 id="pl-title" className="mt-1 text-2xl font-semibold">
                    {playlist.name}
                  </h2>
                  {playlist.description && <p className="mt-1 text-sm text-th-muted">{playlist.description}</p>}
                  <p className="mt-2 text-xs text-th-muted">Sempre toca a versão mais recente de cada faixa.</p>
                </div>
                {queue.length > 0 && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => (playingHere ? player.togglePlay() : player.playQueue(queue, 0))}
                  >
                    {playingHere && player.isPlaying ? <Pause size={16} fill="currentColor" aria-hidden="true" /> : <Play size={16} fill="currentColor" aria-hidden="true" />}
                    {playingHere && player.isPlaying ? "Pausar" : "Tocar tudo"}
                  </button>
                )}
              </div>
              {playlist.tracks.length === 0 ? (
                <p className="p-5 text-sm text-th-muted">Nada aqui por enquanto.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-th-muted">
                    <tr className="border-b border-th-line">
                      <th scope="col" className="w-12 px-5 py-3 font-medium">
                        #
                      </th>
                      <th scope="col" className="py-3 font-medium">
                        Faixa
                      </th>
                      <th scope="col" className="hidden py-3 font-medium md:table-cell">
                        Etapa
                      </th>
                      <th scope="col" className="hidden py-3 font-medium sm:table-cell">
                        Atualizada
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">
                        Duração
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {playlist.tracks.map((item, index) => {
                      const active = player.current?.id === item.fileId;
                      return (
                        <tr key={item.fileId} className={`border-b border-th-line last:border-0 hover:bg-th-raised ${active ? "bg-th-raised" : ""}`}>
                          <td className="px-5 py-3 tabular-nums text-th-muted">
                            <button
                              type="button"
                              onClick={() => (active ? player.togglePlay() : player.playQueue(queue, index))}
                              aria-label={active && player.isPlaying ? `Pausar ${item.title}` : `Tocar ${item.title}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-th-line2"
                            >
                              {active && player.isPlaying ? <Pause size={14} aria-hidden="true" /> : active ? <Play size={14} aria-hidden="true" /> : index + 1}
                            </button>
                          </td>
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-3">
                              <span className="h-10 w-10 flex-none overflow-hidden rounded-md bg-th-line2">
                                {item.coverUrl && <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />}
                              </span>
                              <span className="min-w-0">
                                <Link to={`/projects/${item.projectId}?file=${item.fileId}`} className={`block truncate font-semibold hover:underline ${active ? "text-th-lilac" : "text-th-text"}`}>
                                  {item.title}
                                </Link>
                                <span className="text-xs text-th-muted">
                                  {item.version} · {item.uploader?.name}
                                </span>
                              </span>
                            </div>
                          </td>
                          <td className="hidden py-3 md:table-cell">
                            <StageBadge status={item.status} />
                          </td>
                          <td className="hidden py-3 text-th-muted sm:table-cell">{timeAgo(item.createdAt)}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-th-muted">{item.durationSec ? formatTime(item.durationSec) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      </div>

      <CreatePlaylistModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
    </Page>
  );
}
