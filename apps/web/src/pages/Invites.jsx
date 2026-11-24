import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { apiRequest } from "../api/client";
import { Page } from "../components/layout/AppShell";
import { Avatar } from "../components/ui/Avatar";
import { EmptyState, ErrorNote, PageHeader, SkeletonBlock } from "../components/ui/States";
import { timeAgo } from "../lib/format";

// Convites para entrar em projetos de outras pessoas.
export default function Invites() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/projects/invites")
      .then(setInvites)
      .catch((err) => {
        setError(err.message);
        setInvites([]);
      });
  }, []);

  async function answer(invite, accept) {
    setBusy(invite.id);
    setError("");
    try {
      await apiRequest(`/projects/invites/${invite.id}/${accept ? "accept" : "decline"}`, { method: "POST" });
      if (accept) return navigate(`/projects/${invite.project.id}`);
      setInvites((list) => list.filter((item) => item.id !== invite.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
    return null;
  }

  return (
    <Page>
      <PageHeader title="Convites" subtitle="Projetos para os quais te chamaram para colaborar." />
      <ErrorNote>{error}</ErrorNote>
      {!invites ? (
        <SkeletonBlock className="h-40" />
      ) : invites.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="Nenhum convite pendente"
          text="Quer colaborar? Procure parceiros e convide alguém para um projeto seu."
          action={
            <Link to="/explore" className="btn-secondary">
              Encontrar parceiros
            </Link>
          }
        />
      ) : (
        <ul className="card flex flex-col p-0">
          {invites.map((invite) => (
            <li key={invite.id} className="flex flex-wrap items-center gap-4 border-b border-th-line px-5 py-4 last:border-0">
              <Avatar user={invite.invitedBy} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{invite.invitedBy?.name || "Alguém"}</span> te convidou para <span className="font-semibold">“{invite.project?.name}”</span>
                </p>
                <p className="text-xs text-th-muted">
                  {invite.roleLabel ? `${invite.roleLabel} · ` : ""}
                  {invite.role === "viewer" ? "Ouvinte: ouve e comenta" : "Editor: envia versões e cria tarefas"} · {timeAgo(invite.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary" disabled={busy === invite.id} onClick={() => answer(invite, false)}>
                  Recusar
                </button>
                <button type="button" className="btn-primary" disabled={busy === invite.id} onClick={() => answer(invite, true)}>
                  Aceitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
