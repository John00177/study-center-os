import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { OrgLogo } from "../branding/OrgLogo";

interface RoleLoginCardProps {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  dark?: boolean;
  /** Org name/logo to brand this login page with — omitted entirely for the (unbranded) Platform Admin portal. */
  orgName?: string;
  logoUrl?: string | null;
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  error: string | null;
  loading: boolean;
  onSubmit: (event: React.FormEvent) => void;
  demoHint?: string;
  footer?: ReactNode;
}

export function RoleLoginCard({
  title,
  subtitle,
  icon,
  dark = false,
  orgName,
  logoUrl,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  error,
  loading,
  onSubmit,
  demoHint,
  footer,
}: RoleLoginCardProps) {
  const bgClass = dark ? "bg-slate-950" : "bg-slate-100";
  const cardClass = dark ? "bg-slate-900 border border-slate-800" : "bg-white";
  const titleClass = dark ? "text-white" : "text-slate-900";
  const subtitleClass = dark ? "text-slate-400" : "text-slate-500";
  const labelClass = dark ? "text-slate-300" : "text-slate-700";
  const inputClass = dark
    ? "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
    : "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";
  const buttonClass = dark
    ? "flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400 disabled:opacity-60"
    : "flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60";
  const hintClass = dark ? "text-slate-500" : "text-slate-400";

  return (
    <div className={`flex min-h-screen items-center justify-center p-4 ${bgClass}`}>
      <div className={`animate-fade-in w-full max-w-sm overflow-hidden rounded-xl shadow-md ${cardClass}`}>
        {!dark && <div className="h-1.5 w-full bg-primary" />}
        <div className="p-8">
          <div className="mb-4 flex justify-center">
            {logoUrl !== undefined ? <OrgLogo logoUrl={logoUrl} name={orgName} className="h-14 w-14" /> : icon}
          </div>
          <h1 className={`mb-1 text-center text-2xl font-bold tracking-tight ${titleClass}`}>
            {!dark && orgName ? `Welcome to ${orgName}` : title}
          </h1>
          <p className={`mb-6 text-center text-sm ${subtitleClass}`}>{subtitle}</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className={`mb-1 block text-sm font-medium ${labelClass}`}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className={`mb-1 block text-sm font-medium ${labelClass}`}>
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                className={inputClass}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button type="submit" disabled={loading} className={buttonClass}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </button>

            {demoHint && <p className={`text-center text-xs ${hintClass}`}>{demoHint}</p>}
          </form>

          {footer && <div className="mt-6 space-y-2 text-center text-sm">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
