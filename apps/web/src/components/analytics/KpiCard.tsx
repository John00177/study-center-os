import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string;
  trend?: number | null;
  colorClass?: string;
  icon?: ReactNode;
  sparkline?: ReactNode;
}

export function KpiCard({ label, value, trend, colorClass, icon, sparkline }: KpiCardProps) {
  return (
    <div className="h-24 overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {icon}
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <p className={`text-xl font-semibold ${colorClass ?? "text-slate-900"}`}>{value}</p>
        {sparkline}
      </div>
      {trend !== undefined && trend !== null && (
        <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
          {trend >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(trend).toFixed(1)}% vs last month
        </p>
      )}
    </div>
  );
}
