import { Modal } from "../Modal";
import { DataTable } from "../DataTable";
import { useOrganizationDetail } from "../../hooks/use-platform-admin";
import { formatCurrency } from "../../lib/format";

interface OrganizationDetailModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string | null;
}

export function OrganizationDetailModal({ open, onClose, organizationId }: OrganizationDetailModalProps) {
  const { data, isLoading } = useOrganizationDetail(open ? organizationId : null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={data?.organization.name ?? "Organization"}
      widthClassName="max-w-2xl"
    >
      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      {data && (
        <div className="space-y-6 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Owner</p>
              <p className="text-slate-900">{data.organization.ownerEmail ?? "-"}</p>
              <p className="text-slate-500">{data.organization.ownerPhone ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Location</p>
              <p className="text-slate-900">
                {data.organization.city ?? "-"}, {data.organization.country ?? "-"}
              </p>
              <p className="text-slate-500">{data.organization.address ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Status</p>
              <p className="capitalize text-slate-900">{data.organization.status}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Created</p>
              <p className="text-slate-900">{new Date(data.organization.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase text-slate-400">Stats</p>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-lg font-semibold text-slate-900">{data.stats.branchCount}</p>
                <p className="text-xs text-slate-500">Branches</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-lg font-semibold text-slate-900">{data.stats.teacherCount}</p>
                <p className="text-xs text-slate-500">Teachers</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-lg font-semibold text-slate-900">{data.stats.studentCount}</p>
                <p className="text-xs text-slate-500">Students</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-lg font-semibold text-slate-900">{formatCurrency(data.stats.totalRevenue, "UZS")}</p>
                <p className="text-xs text-slate-500">Revenue</p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase text-slate-400">Subscription History</p>
            <DataTable
              data={data.subscriptionHistory}
              isLoading={false}
              emptyMessage="No subscription history."
              getRowKey={(s) => s.id}
              columns={[
                { header: "Plan", render: (s) => s.planName },
                { header: "Status", render: (s) => <span className="capitalize">{s.status}</span> },
                { header: "Ends", render: (s) => new Date(s.currentPeriodEnd).toLocaleDateString() },
              ]}
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase text-slate-400">Users</p>
            <DataTable
              data={data.users}
              isLoading={false}
              emptyMessage="No users."
              getRowKey={(u) => u.userId}
              columns={[
                { header: "Name", render: (u) => u.name },
                { header: "Role", render: (u) => u.role },
                { header: "Status", render: (u) => <span className="capitalize">{u.status}</span> },
              ]}
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase text-slate-400">Audit Log</p>
            <DataTable
              data={data.auditLog}
              isLoading={false}
              emptyMessage="No audit events."
              getRowKey={(a) => a.id}
              columns={[
                { header: "Action", render: (a) => a.action },
                { header: "When", render: (a) => new Date(a.createdAt).toLocaleString() },
              ]}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
