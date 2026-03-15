import { useAuth } from "../context/AuthContext";
import Skeleton from "../components/Skeleton";
import AvatarCard from "../components/account/AvatarCard";
import ProfileForm from "../components/account/ProfileForm";
import ThemeSelector from "../components/account/ThemeSelector";
import SecurityCard from "../components/account/SecurityCard";

function Account() {
  const { user, loading, setUser } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Skeleton lines={6} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold text-brand-primary">Conta</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-brand-textMuted">Gerencie seu perfil, avatar e preferências.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <ProfileForm user={user} onUpdated={setUser} />
          <ThemeSelector />
          <SecurityCard />
        </div>
        <div className="space-y-6">
          <AvatarCard user={user} onUploaded={setUser} />
        </div>
      </div>
    </div>
  );
}

export default Account;
