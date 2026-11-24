import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/layout/AuthLayout";
import { ErrorNote } from "../components/ui/States";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      await login(form);
      navigate(location.state?.from || "/inicio", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Bem-vindo de volta ao estúdio."
      footer={
        <>
          Ainda não tem conta? <Link to="/register">Criar conta</Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="li-email">
            E-mail
          </label>
          <input id="li-email" className="input" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="li-pass">
            Senha
          </label>
          <input
            id="li-pass"
            className="input"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
        </div>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn-primary w-full" type="submit" disabled={sending}>
          {sending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </AuthLayout>
  );
}
