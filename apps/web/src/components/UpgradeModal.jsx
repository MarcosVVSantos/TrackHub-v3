import { Link } from "react-router-dom";
import { X, Zap } from "lucide-react";

export default function UpgradeModal({ message, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-brand-dark border border-gray-200 dark:border-white/10 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Zap size={20} />
            <span className="font-bold text-lg">Limite atingido</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          {message || "Você atingiu o limite do plano Free."}
        </p>

        <div className="flex flex-col gap-3">
          <Link
            to="/pricing"
            onClick={onClose}
            className="w-full text-center py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition"
          >
            Ver planos
          </Link>
          <button
            onClick={onClose}
            className="w-full text-center py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
