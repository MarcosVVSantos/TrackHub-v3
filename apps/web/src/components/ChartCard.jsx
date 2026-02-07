import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function ChartCard({ title, data }) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-500">{title}</h3>
      <div className="mt-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" stroke="#8796C4" />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#5B1669" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ChartCard;
