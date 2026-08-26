import { useState } from "react";
import { Check, Copy, ShieldAlert } from "lucide-react";
import { useTranslation } from "../../hooks/use-translation";

interface TempPasswordRevealProps {
  label: string;
  password: string;
  onDone: () => void;
}

/** Shown exactly once, right after an account is created — the creator must copy it now. */
export function TempPasswordReveal({ label, password, onDone }: TempPasswordRevealProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <p className="text-sm text-amber-800 dark:text-amber-300">Copy this password now — it won&apos;t be shown again.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-lg tracking-wider text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            {password}
          </code>
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50"
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        {t("Done")}
      </button>
    </div>
  );
}
