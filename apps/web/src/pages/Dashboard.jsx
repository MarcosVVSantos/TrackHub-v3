import { useEffect, useState } from "react";
import { apiRequest, getAccessToken } from "../api/client";
import StatCard from "../components/StatCard";
import ChartCard from "../components/ChartCard";
import Skeleton from "../components/Skeleton";

function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMetrics() {
      try {
        const token = getAccessToken();
        const data = await apiRequest("/dashboard/metrics", { token });
        setMetrics(data);
      } catch (err) {
        setError(err.message);
      }
    }

    loadMetrics();
  }, []);

  if (error) {
    return <div className="mx-auto max-w-6xl p-6 text-red-500">{error}</div>;
  }

  if (!metrics) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <Skeleton lines={6} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Projetos" value={metrics.totalProjects} subtitle="Total" />
        <StatCard title="Ativos" value={metrics.activeProjects} subtitle="Em progresso" />
        <StatCard title="Concluídos" value={metrics.completedProjects} subtitle="Finalizados" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Parceiros" value={metrics.partners} subtitle="Colaboradores" />
        <StatCard title="Plays" value={metrics.plays} subtitle="Reproduções" />
        <StatCard title="Curtidas" value={metrics.likes} subtitle="Likes" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Comentários" value={metrics.comments} subtitle="Interações" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Plays (últimos meses)" data={metrics.charts.playsEvolution} />
        <ChartCard title="Projetos criados" data={metrics.charts.projectsEvolution} />
        <ChartCard title="Versões enviadas" data={metrics.charts.versionsEvolution} />
      </div>
    </div>
  );
}

export default Dashboard;
