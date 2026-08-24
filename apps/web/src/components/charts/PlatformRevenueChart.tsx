import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface PlatformRevenueChartProps {
  data: { name: string; value: number }[];
  valueFormatter?: (value: number) => string;
}

export function PlatformRevenueChart({ data, valueFormatter }: PlatformRevenueChartProps) {
  if (data.length === 0) {
    return <div className="flex h-[200px] items-center justify-center text-xs text-slate-500">No data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          formatter={(value) => [valueFormatter ? valueFormatter(Number(value)) : value, "Value"]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#f8fafc",
          }}
          cursor={{ fill: "#334155", opacity: 0.4 }}
        />
        <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
