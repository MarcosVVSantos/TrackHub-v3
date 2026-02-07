import { useEffect, useState } from "react";
import {
  FolderKanban,
  CheckCircle2,
  Users,
  Play,
  Heart,
  MessageCircle,
  HelpCircle,
  ActivitySquare,
} from "lucide-react";
import { apiRequest, getAccessToken } from "../api/client";
import ChartCard from "../components/ChartCard";
import Skeleton from "../components/Skeleton";
import MetricCard from "../components/dashboard/MetricCard";
import HealthIndicatorCard from "../components/dashboard/HealthIndicatorCard";
import TopContentRanking from "../components/dashboard/TopContentRanking";

function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("6m");
  const [loading, setLoading] = useState(true);

  async function loadMetrics(selectedPeriod) {
    try {
      setLoading(true);
      setError("");
      const token = getAccessToken();
      const data = await apiRequest(`/dashboard/metrics?period=${selectedPeriod}`, { token });
      setMetrics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics(period);
  }, [period]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <Skeleton lines={10} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="card flex flex-col gap-4 border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
          <p>{error}</p>
          <button className="btn-secondary w-fit" onClick={() => loadMetrics(period)}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-brand-text">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-brand-textMuted">
            Visão geral da sua produção e colaboração.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="input min-w-[180px] text-sm"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="30d">Últimos 30 dias</option>
            <option value="3m">Últimos 3 meses</option>
            <option value="6m">Últimos 6 meses</option>
          </select>
          <button
            className="btn-secondary"
            title="O dashboard resume o desempenho dos seus projetos e aponta tendências de engajamento."
            type="button"
          >
            <HelpCircle size={16} />
            Ajuda
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total de projetos"
          value={metrics.metrics.totalProjects}
          subtitle="Portfólio completo"
          icon={FolderKanban}
          tooltip="Quantidade total de projetos ativos ou concluídos."
        />
        <MetricCard
          title="Projetos ativos"
          value={metrics.metrics.activeProjects}
          subtitle="Em andamento"
          icon={ActivitySquare}
          tooltip="Projetos que ainda estão em fase de desenvolvimento."
        />
        <MetricCard
          title="Concluídos"
          value={metrics.metrics.completedProjects}
          subtitle="Finalizados"
          icon={CheckCircle2}
          tooltip="Projetos marcados como finalizados."
        />
        <MetricCard
          title="Parceiros ativos"
          value={metrics.metrics.partners}
          subtitle="Colaborações"
          icon={Users}
          tooltip="Convites aceitos em projetos ativos."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Plays"
          value={metrics.metrics.plays}
          subtitle={metrics.period.label}
          icon={Play}
          tooltip="Total de reproduções no período selecionado."
          trend={metrics.trends.plays}
        />
        <MetricCard
          title="Curtidas"
          value={metrics.metrics.likes}
          subtitle={metrics.period.label}
          icon={Heart}
          tooltip="Total de curtidas recebidas no período."
          trend={metrics.trends.likes}
        />
        <MetricCard
          title="Comentários"
          value={metrics.metrics.comments}
          subtitle={metrics.period.label}
          icon={MessageCircle}
          tooltip="Comentários em faixas e projetos no período."
          trend={metrics.trends.comments}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <HealthIndicatorCard health={metrics.health} />
        <ChartCard title="Plays ao longo do tempo" data={metrics.charts.playsEvolution} />
        <ChartCard title="Projetos criados" data={metrics.charts.projectsEvolution} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Versões enviadas" data={metrics.charts.versionsEvolution} />
        <div className="card flex flex-col justify-center gap-2 lg:col-span-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-brand-text">Resumo rápido</p>
          <p className="text-sm text-gray-500 dark:text-brand-textMuted">
            {`Seu desempenho nos ${metrics.period.label.toLowerCase()} mostra tendências claras de engajamento. Use os rankings abaixo para identificar o que está funcionando.`}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-brand-text">Top content</h2>
          <p className="text-sm text-gray-500 dark:text-brand-textMuted">
            Destaques de performance por plays, curtidas e engajamento.
          </p>
        </div>
        <TopContentRanking ranking={metrics.ranking} />
      </div>
    </div>
  );
}

export default Dashboard;
