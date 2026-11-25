import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/layout/AuthLayout";
import { ErrorNote } from "../components/ui/States";
import GoogleButton, { OrDivider } from "../components/auth/GoogleButton";
import useGoogleSignIn from "../components/auth/useGoogleSignIn";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const google = useGoogleSignIn();

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
      {location.state?.notice && (
        <p role="status" className="mb-4 rounded-[10px] border border-stage-finished/40 bg-stage-finished/10 px-3.5 py-2.5 text-sm text-stage-finished">
          {location.state.notice}
        </p>
      )}
      <GoogleButton onCredential={google.signIn} text="signin_with" />
      {google.loading && <p className="mt-2 text-center text-sm text-th-muted">Entrando com Google…</p>}
      <ErrorNote>{google.error}</ErrorNote>
      <OrDivider />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="li-email">
            E-mail
          </label>
          <input id="li-email" className="input" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label className="label mb-0" htmlFor="li-pass">
              Senha
            </label>
            <Link to="/esqueci-senha" className="text-[13px]">
              Esqueci minha senha
            </Link>
          </div>
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
