import { useMemo, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { apiRequest, getAccessToken } from "../../api/client";

function ProfileForm({ user, onUpdated }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    username: user?.username || "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const hasChanges = useMemo(() => {
    return form.name !== user?.name || form.username !== user?.username;
  }, [form, user]);

  const usernameError = useMemo(() => {
    if (!form.username) return "Username é obrigatório";
    if (form.username.length < 3) return "Username deve ter pelo menos 3 caracteres";
    return "";
  }, [form.username]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (usernameError) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const token = getAccessToken();
      const updated = await apiRequest("/users/me", {
        method: "PUT",
        body: form,
        token,
      });
      onUpdated(updated);
      setMessage("Dados atualizados com sucesso!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-brand-primary">Dados pessoais</h3>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
        <input
          className="input"
          placeholder="Nome"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <input
          className={`input ${usernameError ? "border-red-400" : ""}`}
          placeholder="Username"
          value={form.username}
          onChange={(event) => setForm({ ...form, username: event.target.value })}
        />
        <input className="input md:col-span-2" value={user?.email || ""} readOnly />
        {usernameError && <p className="text-xs text-red-500 md:col-span-2">{usernameError}</p>}
        {error && <p className="text-sm text-red-500 md:col-span-2">{error}</p>}
        {message && <p className="text-sm text-green-500 md:col-span-2">{message}</p>}
        <button className="btn-primary md:col-span-2" type="submit" disabled={!hasChanges || loading || !!usernameError}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Salvar alterações
        </button>
      </form>
    </div>
  );
}

export default ProfileForm;
