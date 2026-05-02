import { Link } from "react-router-dom";
import { Check, X, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const plans = [
  {
    tier: "free",
    label: "Free",
    price: "R$ 0",
    description: "Para quem está começando",
    cta: "Começar grátis",
    ctaLink: "/register",
    highlight: false,
    features: [
      { text: "3 projetos ativos", included: true },
      { text: "2 colaboradores por projeto", included: true },
      { text: "10 tracks publicadas", included: true },
      { text: "500MB de storage", included: true },
      { text: "3 playlists", included: true },
      { text: "Feed e social ilimitados", included: true },
      { text: "Projetos ilimitados", included: false },
      { text: "Colaboradores ilimitados", included: false },
      { text: "Storage de 10GB", included: false },
    ],
  },
  {
    tier: "premium",
    label: "Premium",
    price: "R$ 19,90",
    period: "/mês",
    description: "Para produtores que levam a sério",
    cta: "Fazer upgrade",
    ctaLink: "/account",
    highlight: true,
    features: [
      { text: "Projetos ilimitados", included: true },
      { text: "Colaboradores ilimitados", included: true },
      { text: "Tracks ilimitadas", included: true },
      { text: "10GB de storage", included: true },
      { text: "Playlists ilimitadas", included: true },
      { text: "Feed e social ilimitados", included: true },
      { text: "Suporte prioritário", included: true },
      { text: "Badge Premium no perfil", included: true },
    ],
  },
];

export default function Pricing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-brand-dark text-gray-900 dark:text-brand-text">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Planos</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Comece grátis. Escale quando precisar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`rounded-2xl p-8 border flex flex-col ${
                plan.highlight
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                  : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
              }`}
            >
              {plan.highlight && (
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 text-sm font-semibold mb-4">
                  <Zap size={14} />
                  Recomendado
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">{plan.label}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  {plan.description}
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-gray-500 dark:text-gray-400 mb-1">
                      {plan.period}
                    </span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-3 text-sm">
                    {feature.included ? (
                      <Check size={16} className="text-green-500 shrink-0" />
                    ) : (
                      <X size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
                    )}
                    <span
                      className={
                        feature.included
                          ? "text-gray-800 dark:text-gray-200"
                          : "text-gray-400 dark:text-gray-600"
                      }
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to={user ? plan.ctaLink : "/register"}
                className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition ${
                  plan.highlight
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "border border-gray-300 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-400 dark:text-gray-600 text-sm mt-10">
          Pagamentos via cartão de crédito, débito ou Pix. Cancele quando quiser.
        </p>
      </div>
    </div>
  );
}
