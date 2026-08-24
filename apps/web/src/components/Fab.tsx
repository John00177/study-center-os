import type { ButtonHTMLAttributes, ReactNode } from "react";

interface FabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
}

export function Fab({ icon, label, className, ...rest }: FabProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 disabled:opacity-60 sm:hidden ${className ?? ""}`}
      {...rest}
    >
      {icon}
    </button>
  );
}
