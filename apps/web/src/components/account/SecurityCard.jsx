import { useState } from "react";
import { Shield, X } from "lucide-react";

function SecurityCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={16} />
          <h3 className="text-sm font-semibold text-brand-primary">Segurança</h3>
        </div>
        <button className="btn-secondary" type="button" onClick={() => setOpen(true)}>
          Alterar senha
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Use senhas fortes e não compartilhe seu acesso com terceiros.
      </p>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-brand-primary">Alterar senha</h4>
              <button type="button" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Em breve você poderá alterar sua senha por aqui.
            </p>
            <button className="btn-primary mt-4 w-full" type="button" onClick={() => setOpen(false)}>
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityCard;
