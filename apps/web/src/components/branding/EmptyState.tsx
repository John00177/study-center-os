export type EmptyStateIcon = "students" | "payments" | "generic";

function StudentsIllustration() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-16 w-16 text-slate-300">
      <circle cx="32" cy="22" r="10" stroke="currentColor" strokeWidth="2.5" />
      <path d="M14 52c0-9.94 8.06-18 18-18s18 8.06 18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function PaymentsIllustration() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-16 w-16 text-slate-300">
      <rect x="8" y="18" width="48" height="34" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <path d="M8 26h48" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="46" cy="40" r="4" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

function GenericIllustration() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-16 w-16 text-slate-300">
      <rect x="10" y="14" width="44" height="36" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <path d="M10 24h44M20 34h10M20 40h18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const ILLUSTRATIONS: Record<EmptyStateIcon, () => JSX.Element> = {
  students: StudentsIllustration,
  payments: PaymentsIllustration,
  generic: GenericIllustration,
};

export function EmptyState({ message, icon = "generic" }: { message: string; icon?: EmptyStateIcon }) {
  const Illustration = ILLUSTRATIONS[icon];
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <Illustration />
      <p className="max-w-xs text-sm text-slate-500">{message}</p>
    </div>
  );
}
