import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { apiRequest } from "../api/client";
import AuthLayout from "../components/layout/AuthLayout";
import { ErrorNote } from "../components/ui/States";

// Tempo de espera entre um envio e outro (o servidor também limita: 5 pedidos por hora por conta).
const RESEND_SECONDS = 60;

// Passo 1: a pessoa informa o e-mail e recebe um link para criar uma senha nova.
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  // Contagem regressiva para liberar o "Reenviar".
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function request() {
    setError("");
    setSending(true);
    try {
      await apiRequest("/auth/forgot-password", { method: "POST", body: { email } });
      setCooldown(RESEND_SECONDS);
      return true;
    } catch (err) {
      setError(err.status === 429 ? "Muitas tentativas. Aguarde alguns minutos e tente de novo." : err.message);
      return false;
    } finally {
      setSending(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (await request()) setSent(true);
  }

  async function resend() {
    setResent(false);
    if (await request()) setResent(true);
  }

  if (sent) {
    return (
      <AuthLayout title="Confira seu e-mail" footer={<Link to="/login">Voltar para o login</Link>}>
        <div className="flex flex-col items-start gap-4" role="status">
          <MailCheck size={32} className="text-stage-finished" aria-hidden="true" />
          <p className="text-sm text-th-text2">
            Se existir uma conta com <strong className="text-th-text">{email}</strong>, enviamos um link para criar uma senha nova. Ele vale por 30 minutos.
          </p>
          <p className="text-sm text-th-muted">Não chegou? Olhe a caixa de spam e a aba Promoções.</p>
          <ErrorNote>{error}</ErrorNote>
          {resent && !error && <p className="text-sm text-stage-finished">Enviamos de novo. Use o link do e-mail mais recente.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={resend} disabled={sending || cooldown > 0} aria-live="polite">
              {sending ? "Enviando..." : cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar e-mail"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSent(false);
                setResent(false);
                setError("");
              }}
            >
              Usar outro e-mail
            </button>
          </div>
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
