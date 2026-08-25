import { useState } from "react";
import { useToast } from "../../components/Toast";
import { useParentPayments } from "../../hooks/use-parent-portal";
import { formatCurrency } from "../../lib/format";
import { useTranslation } from "../../hooks/use-translation";

const CHARGE_STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-400",
};

export function ParentPaymentsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useParentPayments();
  const { showToast } = useToast();
  const [payClicked, setPayClicked] = useState(false);

  const balance = data?.balance ?? 0;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">{t("Payments")}</h1>

      <div className={`mb-6 rounded-xl p-6 text-center shadow-sm ${balance > 0 ? "bg-red-50" : "bg-green-50"}`}>
        <p className="text-xs font-medium uppercase text-slate-500">{t("Balance")}</p>
        <p className={`mt-1 text-3xl font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
          {isLoading ? "-" : formatCurrency(balance, "UZS")}
        </p>
        <button
          onClick={() => {
            setPayClicked(true);
            showToast(t("Please contact reception to complete your payment."));
          }}
          disabled={balance <= 0}
          className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-3 text-base font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("Pay Now")}
        </button>
        {payClicked && <p className="mt-2 text-xs text-slate-500">{t("Contact reception to complete your payment.")}</p>}
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t("Charges")}</h2>
        {isLoading && <p className="text-sm text-slate-500">{t("Loading...")}</p>}
        {!isLoading && (!data || data.charges.length === 0) && (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">{t("No charges on file.")}</p>
        )}
        <div className="space-y-2">
          {data?.charges.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{c.description ?? "Charge"}</p>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${CHARGE_STATUS_STYLES[c.status]}`}
                >
                  {c.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{formatCurrency(c.amount, c.currency)}</p>
              <p className="mt-1 text-xs text-slate-400">
                Due {new Date(c.dueDate).toLocaleDateString()}
                {c.daysOverdue != null && <span className="text-red-600"> · {c.daysOverdue} {t("days overdue")}</span>}
                {c.daysUntilDue != null && <span className="text-green-600"> · {c.daysUntilDue} {t("days left")}</span>}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t("Payment History")}</h2>
        {isLoading && <p className="text-sm text-slate-500">{t("Loading...")}</p>}
        {!isLoading && (!data || data.payments.length === 0) && (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">{t("No payments on file.")}</p>
        )}
        <div className="space-y-2">
          {data?.payments.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">{formatCurrency(p.amount, p.currency)}</p>
                <span className="text-sm capitalize text-slate-500">{p.method.replace("_", " ")}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{new Date(p.date).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
