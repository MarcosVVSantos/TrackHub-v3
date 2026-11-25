import { eventTypeOf } from "../../lib/events";

// Mostra o flyer enviado ou, se não houver, um "flyer tipográfico" na cor do tipo de evento.
export default function Flyer({ event, className = "", titleClass = "text-[22px]", showKind = true, kindLabel }) {
  const type = eventTypeOf(event?.eventInfo?.type || event?.type);
  if (event?.coverUrl) {
    return <img src={event.coverUrl} alt="" className={`object-cover ${className}`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`relative flex flex-col justify-end overflow-hidden p-3 ${className}`}
      style={{ background: type.bg, color: type.ink }}
    >
      {showKind && (
        <span className="absolute left-3 top-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
          {kindLabel || type.label}
        </span>
      )}
      <span className={`line-clamp-4 font-extrabold uppercase leading-[0.9] tracking-tight ${titleClass}`}>{event?.name}</span>
    </span>
  );
}
