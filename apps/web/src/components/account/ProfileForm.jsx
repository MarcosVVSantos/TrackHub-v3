import { useMemo, useState } from "react";
import { apiRequest } from "../../api/client";
import { ErrorNote } from "../ui/States";
import { GENRES } from "../projects/CreateProjectModal";
import { ROLES } from "../../lib/format";

const pick = (user) => ({
  name: user?.name || "",
  username: user?.username || "",
  bio: user?.bio || "",
  role: user?.role || "",
  city: user?.city || "",
  genres: Array.isArray(user?.genres) ? user.genres : [],
  openToCollab: Boolean(user?.openToCollab),
});

// Dados pessoais + perfil musical (usado em Encontrar parceiros e nas sugestões do Início).
export default function ProfileForm({ user, onUpdated }) {
  const [form, setForm] = useState(() => pick(user));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const changed = useMemo(() => JSON.stringify(form) !== JSON.stringify(pick(user)), [form, user]);
  const usernameError = !/^[a-zA-Z0-9_.]{3,30}$/.test(form.username) ? "Use de 3 a 30 caracteres: letras, números, ponto e underline." : "";

  const toggleGenre = (genre) =>
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre) ? prev.genres.filter((item) => item !== genre) : [...prev.genres, genre].slice(0, 8),
    }));

  async function submit(event) {
    event.preventDefault();
    if (usernameError) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await apiRequest("/users/me", { method: "PUT", body: { ...form, role: form.role || null, city: form.city || null } });
      onUpdated(updated);
      setMessage("Perfil atualizado.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <section className="card grid gap-4 md:grid-cols-2" aria-labelledby="pf-dados">
        <h2 id="pf-dados" className="font-semibold md:col-span-2">
          Dados pessoais
        </h2>
        <div>
          <label className="label" htmlFor="pf-name">
            Nome
          </label>
          <input id="pf-name" className="input" maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="pf-user">
            Usuário
          </label>
          <input
            id="pf-user"
            className="input"
            aria-invalid={Boolean(usernameError)}
            aria-describedby="pf-user-hint"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
          />
          {usernameError && (
            <p id="pf-user-hint" className="mt-1 text-xs text-th-danger">
              {usernameError}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="pf-email">
            E-mail
          </label>
          <input id="pf-email" className="input opacity-70" value={user?.email || ""} readOnly />
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="pf-bio">
            Bio
          </label>
          <textarea id="pf-bio" rows={3} maxLength={500} className="input" value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} />
        </div>
      </section>

      <section className="card grid gap-4 md:grid-cols-2" aria-labelledby="pf-musica">
        <div className="md:col-span-2">
          <h2 id="pf-musica" className="font-semibold">
            Perfil musical
          </h2>
          <p className="mt-1 text-sm text-th-muted">É assim que outros artistas te encontram em Encontrar parceiros.</p>
        </div>
        <div>
          <label className="label" htmlFor="pf-role">
            O que você faz
          </label>
          <select id="pf-role" className="input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="">Não informar</option>
            {[...new Set([...ROLES, form.role].filter(Boolean))].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pf-city">
            Cidade
          </label>
          <input id="pf-city" className="input" maxLength={60} placeholder="São Paulo, SP" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
        </div>
        <fieldset className="md:col-span-2">
          <legend className="label">Gêneros (até 8)</legend>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...GENRES, ...form.genres])].map((genre) => (
              <button key={genre} type="button" className="chip" aria-pressed={form.genres.includes(genre)} onClick={() => toggleGenre(genre)}>
                {genre}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex cursor-pointer items-center gap-3 text-sm md:col-span-2">
          <input type="checkbox" className="h-5 w-5 accent-[#D9B8E3]" checked={form.openToCollab} onChange={(event) => setForm({ ...form, openToCollab: event.target.checked })} />
          Estou aberto a colaborar em projetos de outras pessoas
        </label>
      </section>

      <ErrorNote>{error}</ErrorNote>
      {message && (
        <p role="status" className="text-sm text-stage-finished">
          {message}
        </p>
      )}
      <button type="submit" className="btn-primary self-start" disabled={!changed || saving || Boolean(usernameError)}>
        {saving ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
