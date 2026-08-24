import { usePlatformHealth } from "../../hooks/use-platform-admin";
import { formatCurrency } from "../../lib/format";

export function PlatformHealthPage() {
  const { data } = usePlatformHealth();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-white">Platform Health</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-24 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-medium text-slate-400">Total Organizations</p>
          <p className="mt-1.5 text-xl font-semibold text-white">{data?.totalOrganizations ?? "-"}</p>
        </div>
        <div className="h-24 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-medium text-slate-400">Active Students</p>
          <p className="mt-1.5 text-xl font-semibold text-white">{data?.totalActiveStudents ?? "-"}</p>
        </div>
        <div className="h-24 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-medium text-slate-400">Active Teachers</p>
          <p className="mt-1.5 text-xl font-semibold text-white">{data?.totalActiveTeachers ?? "-"}</p>
        </div>
        <div className="h-24 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-medium text-slate-400">Total Branches</p>
          <p className="mt-1.5 text-xl font-semibold text-white">{data?.totalBranches ?? "-"}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="h-24 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-medium text-slate-400">Total Groups</p>
          <p className="mt-1.5 text-xl font-semibold text-white">{data?.totalGroups ?? "-"}</p>
        </div>
        <div className="h-24 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-medium text-slate-400">Avg Students / Org</p>
          <p className="mt-1.5 text-xl font-semibold text-white">{data ? data.avgStudentsPerOrg.toFixed(1) : "-"}</p>
        </div>
        <div className="h-24 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-medium text-slate-400">Avg Revenue / Org</p>
          <p className="mt-1.5 text-xl font-semibold text-white">
            {data ? formatCurrency(data.avgRevenuePerOrg, "UZS") : "-"}
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Top Organizations by Revenue</h3>
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <table className="min-w-full divide-y divide-slate-800">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">Name</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-slate-500">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(data?.topOrganizationsByRevenue ?? []).map((org) => (
                <tr key={org.name}>
                  <td className="px-4 py-2 text-sm text-white">{org.name}</td>
                  <td className="px-4 py-2 text-right text-sm text-slate-400">{formatCurrency(org.revenue, "UZS")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
