import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// Janela modal acessível: fecha com Esc ou no X, devolve o foco ao fechar.
export default function Modal({ open, title, description, onClose, children, footer, size = "md" }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    panelRef.current?.querySelector("input, select, textarea, button")?.focus();
    function onKey(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  const width = size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`max-h-[92vh] w-full ${width} overflow-y-auto rounded-t-2xl border border-th-line bg-th-surface p-6 sm:rounded-2xl`}
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex-1">
            <h2 id="modal-title" className="text-lg font-semibold text-th-text">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-th-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="btn-ghost -mr-2 -mt-1 h-10 w-10 px-0">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}
