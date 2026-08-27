import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "../../hooks/use-translation";
import { useIsDark } from "../../hooks/use-is-dark";

interface RateTrendChartProps {
  data: { name: string; value: number }[];
  color?: string;
  valueFormatter?: (value: number) => string;
}

/** Single-series trend line — used where EnrollmentChart's two fixed series don't apply (e.g. daily attendance rate). */
export function RateTrendChart({ data, color = "#10b981", valueFormatter }: RateTrendChartProps) {
  const { t } = useTranslation();
  const isDark = useIsDark();
  if (data.length === 0) {
    return <div className="flex h-[200px] items-center justify-center text-xs text-slate-400">{t("No data")}</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          formatter={(value) => [valueFormatter ? valueFormatter(Number(value)) : value, "Rate"]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
            background: isDark ? "#1e293b" : "#ffffff",
            color: isDark ? "#f1f5f9" : "#0f172a",
          }}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
