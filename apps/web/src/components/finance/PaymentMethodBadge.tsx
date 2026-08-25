import { useTranslation } from "../../hooks/use-translation";

// Text labels only — no real payment gateway/API integration behind any of these.
export const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "click", label: "Click" },
  { value: "payme", label: "Payme" },
  { value: "humo_terminal", label: "Humo Terminal" },
  { value: "uzum_bank", label: "Uzum Bank" },
] as const;

const PAYMENT_METHOD_STYLES: Record<string, string> = {
  cash: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  bank_transfer: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  card: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  click: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  payme: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  humo_terminal: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  uzum_bank: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ?? method.replace(/_/g, " ");
}

export function PaymentMethodBadge({ method }: { method: string }) {
  const { t } = useTranslation();
  const style = PAYMENT_METHOD_STYLES[method] ?? "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${style}`}>
      {t(paymentMethodLabel(method))}
    </span>
  );
}
