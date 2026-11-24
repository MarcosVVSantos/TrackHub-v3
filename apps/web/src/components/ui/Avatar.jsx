import { avatarColor, initials } from "../../lib/format";

const SIZES = { xs: "h-6 w-6 text-[10px]", sm: "h-7 w-7 text-[11px]", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg", xl: "h-20 w-20 text-2xl" };

export function Avatar({ user, size = "md", ring = false, className = "" }) {
  const name = user?.name || user?.username || "";
  const base = `inline-flex flex-none items-center justify-center overflow-hidden rounded-full font-bold text-th-sidebar ${SIZES[size]} ${
    ring ? "border-2 border-th-surface" : ""
  } ${className}`;
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className={`${base} object-cover`} />;
  }
  return (
    <span aria-hidden="true" className={base} style={{ background: avatarColor(user?.id || name) }}>
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ users = [], max = 4, size = "sm" }) {
  const shown = users.filter(Boolean).slice(0, max);
  const rest = users.length - shown.length;
  return (
    <span className="flex items-center" aria-label={users.map((u) => u?.name).filter(Boolean).join(", ")}>
      {shown.map((user, index) => (
        <span key={user.id || index} className="-mr-1.5">
          <Avatar user={user} size={size} ring />
        </span>
      ))}
      {rest > 0 && <span className="ml-3 text-xs text-th-muted">+{rest}</span>}
    </span>
  );
}

export default Avatar;
