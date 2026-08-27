import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "../../hooks/use-translation";
import { useIsDark } from "../../hooks/use-is-dark";

interface RevenueChartProps {
  data: { name: string; value: number }[];
  valueFormatter?: (value: number) => string;
  color?: string;
}

export function RevenueChart({ data, valueFormatter, color = "#6366f1" }: RevenueChartProps) {
  const { t } = useTranslation();
  const isDark = useIsDark();
  if (data.length === 0) {
    return <div className="flex h-[200px] items-center justify-center text-xs text-slate-400">{t("No data")}</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          formatter={(value) => [valueFormatter ? valueFormatter(Number(value)) : value, "Value"]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
            background: isDark ? "#1e293b" : "#ffffff",
            color: isDark ? "#f1f5f9" : "#0f172a",
          }}
          cursor={{ fill: isDark ? "#334155" : "#f1f5f9" }}
        />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
