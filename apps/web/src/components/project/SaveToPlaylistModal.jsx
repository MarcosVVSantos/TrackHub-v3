import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/client";
import Modal from "../ui/Modal";
import { ErrorNote } from "../ui/States";

// Playlists só aceitam faixas públicas (regra do back-end).
export default function SaveToPlaylistModal({ open, onClose, trackId }) {
  const [playlists, setPlaylists] = useState(null);
  const [saved, setSaved] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    apiRequest("/playlists/mine")
      .then((data) => setPlaylists(Array.isArray(data) ? data : data.items || []))
      .catch((err) => setError(err.message));
  }, [open]);

  async function add(playlist) {
    setError("");
    try {
      await apiRequest(`/playlists/${playlist.id}/tracks`, { method: "POST", body: { trackId } });
      setSaved((list) => [...list, playlist.id]);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Salvar em playlist" size="sm">
      {!playlists ? (
        <p className="text-sm text-th-muted">Carregando…</p>
      ) : playlists.length === 0 ? (
        <p className="text-sm text-th-muted">
          Você ainda não tem playlists. <Link to="/playlists" className="text-th-link underline">Criar uma</Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {playlists.map((playlist) => (
            <li key={playlist.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-th-raised">
              <span className="flex-1 truncate text-sm">{playlist.name}</span>
              <button type="button" className="btn-secondary h-9 min-h-0 px-3 text-xs" disabled={saved.includes(playlist.id)} onClick={() => add(playlist)}>
                {saved.includes(playlist.id) ? "Salva" : "Adicionar"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <ErrorNote>{error}</ErrorNote>
    </Modal>
  );
}
