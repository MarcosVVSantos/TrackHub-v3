import { Palette } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="card">
      <div className="flex items-center gap-2">
        <Palette size={16} />
        <h3 className="text-sm font-semibold text-brand-primary">Preferências</h3>
      </div>
      <p className="mt-2 text-xs text-gray-500">Escolha como você quer ver o TrackHub.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          className={`rounded-xl border p-4 text-left transition ${
            theme === "light" ? "border-brand-primary bg-brand-accent/20" : "border-gray-200"
          }`}
          onClick={() => setTheme("light")}
        >
          <p className="text-sm font-semibold">Claro</p>
          <p className="text-xs text-gray-500">Fundo claro e destaque roxo.</p>
        </button>
        <button
          type="button"
          className={`rounded-xl border p-4 text-left transition ${
            theme === "dark" ? "border-brand-primary bg-brand-accent/20" : "border-gray-200"
          }`}
          onClick={() => setTheme("dark")}
        >
          <p className="text-sm font-semibold">Escuro</p>
          <p className="text-xs text-gray-500">Interface com contraste noturno.</p>
        </button>
      </div>
    </div>
  );
}

export default ThemeSelector;
