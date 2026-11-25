import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import AuthLayout from "../components/layout/AuthLayout";
import { ErrorNote } from "../components/ui/States";

// Passo 2: a pessoa chega pelo link do e-mail (?token=...) e escolhe a senha nova.
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const rules = [
    { ok: password.length >= 8, label: "Pelo menos 8 caracteres" },
    { ok: /[A-Za-z]/.test(password) && /[0-9]/.test(password), label: "Letras e números" },
  ];
  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(event) {
    event.preventDefault();
    if (mismatch || rules.some((rule) => !rule.ok)) return;
    setError("");
    setSending(true);
    try {
      await apiRequest("/auth/reset-password", { method: "POST", body: { token, password } });
      navigate("/login", { replace: true, state: { notice: "Senha alterada! Entre com a senha nova." } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Link incompleto" footer={<Link to="/login">Voltar para o login</Link>}>
        <p className="text-sm text-th-text2">Abra o link exatamente como chegou no e-mail, ou peça um novo.</p>
        <Link to="/esqueci-senha" className="btn-primary mt-5 w-full">
          Pedir novo link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Criar senha nova" subtitle="Depois disso, você entra com a senha nova. Por segurança, as outras sessões abertas são encerradas.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="rp-pass">
            Senha nova
          </label>
          <input
            id="rp-pass"
            className="input"
            type="password"
            autoComplete="new-password"
            aria-describedby="rp-rules"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <ul id="rp-rules" className="mt-2 flex flex-col gap-1 text-xs">
            {rules.map((rule) => (
              <li key={rule.label} className={rule.ok ? "text-stage-finished" : "text-th-muted"}>
                {rule.ok ? "✓" : "•"} {rule.label}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label className="label" htmlFor="rp-confirm">
            Repita a senha
          </label>
          <input
            id="rp-confirm"
            className="input"
            type="password"
            autoComplete="new-password"
            aria-invalid={mismatch}
            aria-describedby={mismatch ? "rp-mismatch" : undefined}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
          {mismatch && (
            <p id="rp-mismatch" className="mt-1 text-xs text-th-danger">
              As senhas não são iguais.
            </p>
          )}
        </div>
        <ErrorNote>{error}</ErrorNote>
        {error && (
          <Link to="/esqueci-senha" className="text-sm">
            Pedir um link novo
          </Link>
        )}
        <button className="btn-primary w-full" type="submit" disabled={sending || mismatch || rules.some((rule) => !rule.ok)}>
          {sending ? "Salvando..." : "Salvar senha nova"}
        </button>
      </form>
    </AuthLayout>
  );
}
