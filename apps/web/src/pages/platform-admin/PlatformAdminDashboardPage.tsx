import { Banknote, Building, ClipboardList, GraduationCap, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { PlatformRevenueChart } from "../../components/charts/PlatformRevenueChart";
import { OrgStatusChart } from "../../components/charts/OrgStatusChart";
import {
  useOrganizations,
  usePendingApplications,
  usePlatformHealth,
  usePlatformRevenue,
} from "../../hooks/use-platform-admin";

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function KpiCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="h-24 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        {icon}
      </div>
      <p className="mt-1.5 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function PlatformAdminDashboardPage() {
  const navigate = useNavigate();
  const { data: orgs } = useOrganizations();
  const { data: health } = usePlatformHealth();
  const { data: revenue } = usePlatformRevenue();
  const { data: applications } = usePendingApplications();
  const pendingCount = applications?.length ?? 0;

  const monthly = revenue?.monthlyRevenue ?? [];
  const thisMonthRevenue = monthly[monthly.length - 1]?.amount ?? 0;

  const recentSignups = [...(orgs ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const statusCounts = [
    { name: "Active", value: revenue?.activeOrganizations ?? 0, color: "#22c55e" },
    { name: "Trial", value: revenue?.trialOrganizations ?? 0, color: "#818cf8" },
    { name: "Suspended", value: revenue?.suspendedOrganizations ?? 0, color: "#ef4444" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-white">Platform Dashboard</h1>

      {pendingCount > 0 && (
        <button
          onClick={() => navigate("/admin/applications")}
          className="mb-4 flex w-full items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-left transition hover:bg-amber-500/20"
        >
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-medium text-amber-200">
              Pending Approvals ({pendingCount})
            </span>
          </div>
          <span className="text-xs text-amber-300">Review →</span>
        </button>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Study Centers" value={String(health?.totalOrganizations ?? "-")} icon={<Building size={18} className="text-slate-400" />} />
        <KpiCard label="Total Students" value={String(health?.totalActiveStudents ?? "-")} icon={<Users size={18} className="text-slate-400" />} />
        <KpiCard label="Total Teachers" value={String(health?.totalActiveTeachers ?? "-")} icon={<GraduationCap size={18} className="text-slate-400" />} />
        <KpiCard label="Monthly Revenue (USD)" value={formatUsd(thisMonthRevenue)} icon={<Banknote size={18} className="text-slate-400" />} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Monthly Revenue (12mo)</h3>
          <PlatformRevenueChart
            data={monthly.map((m) => ({ name: m.month.slice(2), value: m.amount }))}
            valueFormatter={formatUsd}
          />
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Organizations by Status</h3>
          <OrgStatusChart data={statusCounts} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Recent Signups</h3>
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <table className="min-w-full divide-y divide-slate-800">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">Plan</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">Signed Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentSignups.map((org) => (
                  <tr key={org.id}>
                    <td className="px-4 py-2 text-sm text-white">{org.name}</td>
                    <td className="px-4 py-2 text-sm text-slate-400">{org.subscription?.planName ?? "-"}</td>
                    <td className="px-4 py-2 text-sm text-slate-400">{new Date(org.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Top Revenue Centers</h3>
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <table className="min-w-full divide-y divide-slate-800">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">Name</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-slate-500">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(health?.topOrganizationsByRevenue ?? []).map((org) => (
                  <tr key={org.name}>
                    <td className="px-4 py-2 text-sm text-white">{org.name}</td>
                    <td className="px-4 py-2 text-right text-sm text-slate-400">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "UZS" }).format(org.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
