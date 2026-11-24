import { useAuth } from "../context/AuthContext";
import { Page } from "../components/layout/AppShell";
import { PageHeader, SkeletonBlock } from "../components/ui/States";
import AvatarCard from "../components/account/AvatarCard";
import ProfileForm from "../components/account/ProfileForm";
import SecurityCard from "../components/account/SecurityCard";

export default function Account() {
  const { user, loading, setUser } = useAuth();

  return (
    <Page>
      <PageHeader title="Conta" subtitle="Seu perfil, sua foto e a segurança da conta." />
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
