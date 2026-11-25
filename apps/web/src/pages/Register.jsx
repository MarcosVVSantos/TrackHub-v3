import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/layout/AuthLayout";
import { ErrorNote } from "../components/ui/States";
import GoogleButton, { OrDivider, googleLoginEnabled } from "../components/auth/GoogleButton";
import useGoogleSignIn from "../components/auth/useGoogleSignIn";

const FIELDS = [
  { id: "name", label: "Nome", autoComplete: "name" },
  { id: "username", label: "Usuário", autoComplete: "username", hint: "3 a 30 caracteres: letras, números, ponto e underline" },
  { id: "email", label: "E-mail", type: "email", autoComplete: "email" },
  { id: "password", label: "Senha", type: "password", autoComplete: "new-password" },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const google = useGoogleSignIn();

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      await register(form);
      navigate("/inicio");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Crie faixas junto com outros artistas."
      footer={
        <>
          Já tem conta? <Link to="/login">Entrar</Link>
        </>
      }
    >
      <GoogleButton onCredential={google.signIn} text="signup_with" />
      {googleLoginEnabled && (
        <p className="mt-2 text-center text-xs text-th-muted">
          Ao continuar com o Google, você aceita os <Link to="/termos" target="_blank">Termos de uso</Link> e a{" "}
          <Link to="/privacidade" target="_blank">Política de privacidade</Link>.
        </p>
      )}
      {google.loading && <p className="mt-2 text-center text-sm text-th-muted">Criando sua conta…</p>}
      <ErrorNote>{google.error}</ErrorNote>
      <OrDivider />
      <form onSubmit={submit} className="flex flex-col gap-4">
        {FIELDS.map((field) => (
          <div key={field.id}>
            <label className="label" htmlFor={`rg-${field.id}`}>
              {field.label}
            </label>
            <input
              id={`rg-${field.id}`}
              className="input"
              type={field.type || "text"}
              autoComplete={field.autoComplete}
              aria-describedby={field.hint ? `rg-${field.id}-hint` : undefined}
              value={form[field.id]}
              onChange={(event) => setForm({ ...form, [field.id]: event.target.value })}
              required
            />
            {field.hint && (
              <p id={`rg-${field.id}-hint`} className="mt-1 text-xs text-th-muted">
                {field.hint}
              </p>
            )}
          </div>
        ))}
        <label className="flex items-start gap-3 text-sm text-th-text2">
          <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#D9B8E3]" required />
          <span>
            Li e aceito os{" "}
            <Link to="/termos" target="_blank">
              Termos de uso
            </Link>{" "}
            e a{" "}
            <Link to="/privacidade" target="_blank">
              Política de privacidade
            </Link>
          </span>
        </label>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn-primary w-full" type="submit" disabled={sending}>
          {sending ? "Criando..." : "Criar conta"}
        </button>
      </form>
    </AuthLayout>
  );
}
