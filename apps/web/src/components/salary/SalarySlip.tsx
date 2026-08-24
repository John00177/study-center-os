import { Printer } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { resolveOrgDisplayName } from "../../lib/theme";
import { formatCurrency } from "../../lib/format";
import { numberToWords } from "../../lib/number-to-words";
import { OrgLogo } from "../branding/OrgLogo";

interface SalarySlipProps {
  teacherName: string;
  month: string; // "YYYY-MM"
  amount: number;
  currency: string;
  paidAt: string | null;
  paymentMethod: string | null;
}

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function SalarySlip({ teacherName, month, amount, currency, paidAt, paymentMethod }: SalarySlipProps) {
  const { branding } = useTheme();
  const orgName = resolveOrgDisplayName(branding);

  return (
    <div>
      <div className="print-area mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 print:rounded-none print:border-none print:shadow-none">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <OrgLogo logoUrl={branding?.logoUrl} name={orgName} className="h-10 w-10" />
          <div>
            <p className="text-lg font-semibold text-slate-900">{orgName}</p>
            <p className="text-xs text-slate-500">Salary Payment Slip</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Teacher</p>
            <p className="font-medium text-slate-900">{teacherName}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Month</p>
            <p className="font-medium text-slate-900">{monthLabel(month)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Payment date</p>
            <p className="font-medium text-slate-900">{paidAt ? new Date(paidAt).toLocaleDateString() : "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Payment method</p>
            <p className="font-medium capitalize text-slate-900">{paymentMethod?.replace("_", " ") ?? "—"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Amount</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(amount, currency)}</p>
          <p className="mt-1 text-xs capitalize text-slate-500">{numberToWords(amount)} {currency} only</p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
          <div>
            <div className="h-10 border-b border-slate-400" />
            <p className="mt-1 text-xs text-slate-500">Received by</p>
          </div>
          <div>
            <div className="h-10 border-b border-slate-400" />
            <p className="mt-1 text-xs text-slate-500">Authorized by</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-center print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Printer className="h-4 w-4" />
          Print Slip
        </button>
      </div>
    </div>
  );
}
