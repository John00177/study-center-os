import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "../../hooks/use-translation";
import { useIsDark } from "../../hooks/use-is-dark";

interface RevenueVsSalaryChartProps {
  data: { month: string; revenue: number; salary: number }[];
  valueFormatter?: (value: number) => string;
}

export function RevenueVsSalaryChart({ data, valueFormatter }: RevenueVsSalaryChartProps) {
  const { t } = useTranslation();
  const isDark = useIsDark();
  if (data.length === 0) {
    return <div className="flex h-[220px] items-center justify-center text-xs text-slate-400">{t("No data")}</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          formatter={(value) => [valueFormatter ? valueFormatter(Number(value)) : value, ""]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
            background: isDark ? "#1e293b" : "#ffffff",
            color: isDark ? "#f1f5f9" : "#0f172a",
          }}
          cursor={{ fill: isDark ? "#334155" : "#f1f5f9" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: isDark ? "#cbd5e1" : "#334155" }} />
        <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="salary" name="Salary Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
