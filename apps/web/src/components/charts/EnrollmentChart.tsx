import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "../../hooks/use-translation";
import { useIsDark } from "../../hooks/use-is-dark";

interface EnrollmentChartProps {
  data: { month: string; newStudents: number; droppedStudents: number }[];
}

export function EnrollmentChart({ data }: EnrollmentChartProps) {
  const { t } = useTranslation();
  const isDark = useIsDark();
  if (data.length === 0) {
    return <div className="flex h-[200px] items-center justify-center text-xs text-slate-400">{t("No data")}</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
            background: isDark ? "#1e293b" : "#ffffff",
            color: isDark ? "#f1f5f9" : "#0f172a",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: isDark ? "#cbd5e1" : "#334155" }} />
        <Line
          type="monotone"
          dataKey="newStudents"
          name="New"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="droppedStudents"
          name="Dropped"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
