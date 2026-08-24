import type { SalaryPaymentStatus, SalaryStatus } from "@crm/shared-types";

const PAYMENT_STYLES: Record<SalaryPaymentStatus, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  delayed: "bg-red-100 text-red-700",
};

const SALARY_STATUS_STYLES: Record<SalaryStatus, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  terminated: "bg-slate-100 text-slate-500",
};

export function PaymentStatusBadge({ status }: { status: SalaryPaymentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PAYMENT_STYLES[status]}`}>
      {status}
    </span>
  );
}

export function SalaryStatusBadge({ status }: { status: SalaryStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${SALARY_STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}
