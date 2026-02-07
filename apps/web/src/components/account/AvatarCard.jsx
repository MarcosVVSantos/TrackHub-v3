import { useMemo, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { API_URL, getAccessToken } from "../../api/client";

function AvatarCard({ user, onUploaded }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const initials = useMemo(() => {
    if (!user?.name) return "";
    return user.name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [user]);

  async function handleUpload(selected) {
    if (!selected) return;
    setLoading(true);
    setMessage("");
    setError("");
    const token = getAccessToken();
    const formData = new FormData();
    formData.append("avatar", selected);

    const response = await fetch(`${API_URL}/users/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: "Erro ao enviar avatar" }));
      setError(data.message);
      setLoading(false);
      return;
    }

    const updated = await response.json();
    onUploaded(updated);
    setMessage("Avatar atualizado com sucesso!");
    setLoading(false);
  }

  function handleFileChange(event) {
    const selected = event.target.files[0];
    if (!selected) return;
    if (!/image\/(png|jpeg)/.test(selected.type)) {
      setError("Envie um arquivo JPG ou PNG");
      return;
    }
    if (selected.size > 2 * 1024 * 1024) {
      setError("O arquivo deve ter no máximo 2MB");
      return;
    }
    setError("");
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    handleUpload(selected);
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-brand-primary">Foto de perfil</h3>
          <p className="text-xs text-gray-500">Escolha uma imagem profissional.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative h-28 w-28">
          {user?.avatarUrl || preview ? (
            <img
              src={preview || user.avatarUrl}
              alt={user?.name}
              className="h-28 w-28 rounded-full border border-gray-200 object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-brand-accent/30 text-xl font-semibold text-brand-primary">
              {initials}
            </div>
          )}
        </div>
        <div className="flex w-full flex-col gap-3">
          <input
            ref={fileRef}
            className="hidden"
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleFileChange}
          />
          <button
            className="btn-secondary w-full sm:w-auto"
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
          >
            <Camera size={16} />
            Alterar foto
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {message && <p className="text-sm text-green-500">{message}</p>}
        </div>
      </div>
    </div>
  );
}

export default AvatarCard;
