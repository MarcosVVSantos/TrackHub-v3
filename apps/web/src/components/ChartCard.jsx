import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function ChartCard({ title, data, accent = "#5B1669", valueFormatter }) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-brand-textMuted">{title}</h3>
      <div className="mt-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" stroke="#8796C4" tick={{ fill: "#8796C4" }} />
            <Tooltip
              formatter={(value) =>
                valueFormatter ? valueFormatter(value) : new Intl.NumberFormat("pt-BR").format(value)
              }
              contentStyle={{
                backgroundColor: "#2E134A",
                borderColor: "#3B1B5A",
                color: "#F3EDF7",
                borderRadius: "12px",
              }}
              labelStyle={{ color: "#CBBFD6" }}
            />
            <Line type="monotone" dataKey="value" stroke={accent} strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ChartCard;
