import { useEffect, useState } from "react";
import { apiRequest, getAccessToken } from "../api/client";
import { Heart, MessageCircle, Play } from "lucide-react";

function Feed() {
  const [tracks, setTracks] = useState([]);
  const [error, setError] = useState("");

  async function loadFeed() {
    try {
      const data = await apiRequest("/feed");
      setTracks(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadFeed();
  }, []);

  async function handleLike(id) {
    const token = getAccessToken();
    if (!token) return;
  await apiRequest(`/tracks/${id}/like`, { method: "POST", token });
    loadFeed();
  }

  async function handlePlay(id) {
    const token = getAccessToken();
  await apiRequest(`/tracks/${id}/play`, { method: "POST", token });
    loadFeed();
  }

  async function handleComment(id, content) {
    const token = getAccessToken();
  await apiRequest(`/tracks/${id}/comment`, { method: "POST", body: { content }, token });
    loadFeed();
  }

  if (error) {
    return <div className="mx-auto max-w-6xl p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <h2 className="text-xl font-semibold text-brand-primary">Feed Público</h2>
      {tracks.map((track) => (
        <div key={track.id} className="card">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-brand-primary">{track.title}</h3>
              <p className="text-sm text-gray-500">{track.description || "Sem descrição"}</p>
            </div>
            <span className="text-xs text-gray-400">{track.project?.name}</span>
          </div>
          <audio className="mt-3 w-full" controls src={track.audioUrl} onPlay={() => handlePlay(track.id)} />
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <button className="btn-secondary" onClick={() => handleLike(track.id)}>
              <Heart size={16} />
              Curtir ({track._count?.likes || 0})
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                const content = prompt("Comentário");
                if (content) handleComment(track.id, content);
              }}
            >
              <MessageCircle size={16} />
              Comentar ({track._count?.comments || 0})
            </button>
            <span className="flex items-center gap-2 text-xs text-gray-400">
              <Play size={14} />
              {track._count?.plays || 0} plays
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Feed;
