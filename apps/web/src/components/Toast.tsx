import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "../hooks/use-translation";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

const VARIANT_STYLES: Record<ToastVariant, { border: string; bg: string; text: string; icon: ReactNode }> = {
  success: {
    border: "border-l-green-500",
    bg: "bg-white dark:bg-slate-800",
    text: "text-slate-800 dark:text-slate-100",
    icon: <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />,
  },
  error: {
    border: "border-l-red-500",
    bg: "bg-white dark:bg-slate-800",
    text: "text-slate-800 dark:text-slate-100",
    icon: <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />,
  },
  info: {
    border: "border-l-blue-500",
    bg: "bg-white dark:bg-slate-800",
    text: "text-slate-800 dark:text-slate-100",
    icon: <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col-reverse items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end sm:px-0">
        {toasts.map((toast) => {
          const styles = VARIANT_STYLES[toast.variant];
          return (
            <div
              key={toast.id}
              role="status"
              className={`animate-fade-in pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border border-l-4 border-slate-200 p-3 shadow-lg dark:border-slate-700 ${styles.border} ${styles.bg}`}
            >
              {styles.icon}
              <p className={`flex-1 text-sm font-medium ${styles.text}`}>{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded p-0.5 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10"
                aria-label={t("Dismiss")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
