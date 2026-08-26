import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { useToast } from "../../components/Toast";
import { useStudentPortalPayments } from "../../hooks/use-student-portal";
import { formatCurrency } from "../../lib/format";
import { useTranslation } from "../../hooks/use-translation";

const CHARGE_STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500",
};

export function StudentPaymentsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useStudentPortalPayments();
  const { showToast } = useToast();
  const [payClicked, setPayClicked] = useState(false);

  const balance = data?.balance ?? 0;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">{t("Payments")}</h1>

      <div className={`mb-6 rounded-xl p-6 text-center shadow-sm ${balance > 0 ? "bg-red-50" : "bg-green-50"}`}>
        <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{t("Balance")}</p>
        <p className={`mt-1 text-3xl font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
          {isLoading ? "-" : formatCurrency(balance, "UZS")}
        </p>
        <button
          onClick={() => {
            setPayClicked(true);
            showToast(t("Please contact reception to complete your payment."));
          }}
          disabled={balance <= 0}
          className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("Pay Now")}
        </button>
        {payClicked && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("Contact reception to complete your payment.")}</p>}
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("Charges")}</h2>
        <DataTable
          data={data?.charges}
          isLoading={isLoading}
          emptyMessage={t("No charges on file.")}
          getRowKey={(c) => c.id}
          columns={[
            { header: t("Description"), render: (c) => c.description ?? "-" },
            { header: t("Amount"), render: (c) => formatCurrency(c.amount, c.currency) },
            { header: t("Due date"), render: (c) => new Date(c.dueDate).toLocaleDateString() },
            {
              header: t("Status"),
              render: (c) => (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${CHARGE_STATUS_STYLES[c.status]}`}>
                  {c.status}
                </span>
              ),
            },
          ]}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("Payments")}</h2>
        <DataTable
          data={data?.payments}
          isLoading={isLoading}
          emptyMessage={t("No payments on file.")}
          getRowKey={(p) => p.id}
          columns={[
            { header: t("Amount"), render: (p) => formatCurrency(p.amount, p.currency) },
            { header: t("Date"), render: (p) => new Date(p.date).toLocaleDateString() },
            { header: t("Method"), render: (p) => <span className="capitalize">{p.method.replace("_", " ")}</span> },
          ]}
        />
      </div>
    </div>
  );
}
