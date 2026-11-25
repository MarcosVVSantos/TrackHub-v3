import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Page } from "../components/layout/AppShell";
import { PageHeader, SkeletonBlock } from "../components/ui/States";
import AvatarCard from "../components/account/AvatarCard";
import ProfileForm from "../components/account/ProfileForm";
import SecurityCard from "../components/account/SecurityCard";

export default function Account() {
  const { user, loading, setUser } = useAuth();
  // ?bemvindo=1: acabou de criar a conta com o Google.
  const [params] = useSearchParams();
  const welcome = params.get("bemvindo") === "1";

  return (
    <Page>
      <PageHeader title="Conta" subtitle="Seu perfil, sua foto e a segurança da conta." />
      {welcome && user && (
        <div role="status" className="card border-th-lilac/40">
          <p className="font-semibold">Bem-vindo ao TrackHub, {user.name.split(" ")[0]}!</p>
          <p className="mt-1 text-sm text-th-text2">
            Criamos seu usuário como <strong className="text-th-text">@{user.username}</strong>. Se quiser, troque abaixo e conte o que você faz:
            assim outros artistas te encontram em Encontrar parceiros.
          </p>
        </div>
      )}
      {loading || !user ? (
        <SkeletonBlock className="h-80" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <ProfileForm key={user.id} user={user} onUpdated={setUser} />
            <SecurityCard />
          </div>
          <div>
            <AvatarCard user={user} onUploaded={setUser} />
          </div>
        </div>
      )}
    </Page>
  );
}
