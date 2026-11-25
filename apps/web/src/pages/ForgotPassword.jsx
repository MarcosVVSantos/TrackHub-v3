import { useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { apiRequest } from "../api/client";
import AuthLayout from "../components/layout/AuthLayout";
import { ErrorNote } from "../components/ui/States";

// Passo 1: a pessoa informa o e-mail e recebe um link para criar uma senha nova.
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      await apiRequest("/auth/forgot-password", { method: "POST", body: { email } });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Confira seu e-mail" footer={<Link to="/login">Voltar para o login</Link>}>
        <div className="flex flex-col items-start gap-4" role="status">
          <MailCheck size={32} className="text-stage-finished" aria-hidden="true" />
          <p className="text-sm text-th-text2">
            Se existir uma conta com <strong className="text-th-text">{email}</strong>, enviamos um link para criar uma senha nova. Ele vale por 30 minutos.
          </p>
          <p className="text-sm text-th-muted">Não chegou? Olhe a caixa de spam ou tente de novo em alguns minutos.</p>
          <button type="button" className="btn-secondary" onClick={() => setSent(false)}>
            Usar outro e-mail
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Esqueci minha senha"
      subtitle="Informe o e-mail da sua conta. Vamos te mandar um link para criar uma senha nova."
      footer={
        <>
          Lembrou? <Link to="/login">Entrar</Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="fp-email">
            E-mail
          </label>
          <input id="fp-email" className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn-primary w-full" type="submit" disabled={sending}>
          {sending ? "Enviando..." : "Enviar link"}
        </button>
      </form>
    </AuthLayout>
  );
}
