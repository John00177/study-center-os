import { isAxiosError } from "axios";
import { Loader2, Users } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useParentLogin } from "../hooks/use-parent-portal";
import { useParentAuthStore } from "../stores/parent-auth.store";
import { useTranslation } from "../hooks/use-translation";

type LoginMode = "phone" | "email";

export function ParentLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setParent = useParentAuthStore((state) => state.setParent);
  const parentLogin = useParentLogin();

  const [mode, setMode] = useState<LoginMode>("phone");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await parentLogin.mutateAsync({ identifier: identifier.trim(), password });
      setParent(result);
      navigate("/parent/dashboard");
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        setError(`No student found with this ${mode}, or the password is incorrect.`);
      } else if (isAxiosError(err) && err.response?.status === 403) {
        setError((err.response.data as { message?: string })?.message ?? "Your child's account is inactive.");
      } else {
        setError("Invalid credentials. Please try again.");
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="mb-1 text-center text-2xl font-semibold text-slate-900">{t("Parent Portal")}</h1>
        <p className="mb-6 text-center text-sm text-slate-500">{t("Track your child's progress")}</p>

        <div className="mb-5 flex rounded-md bg-slate-100 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setMode("phone");
              setIdentifier("");
            }}
            className={`flex-1 rounded-md py-1.5 transition ${
              mode === "phone" ? "bg-white text-primary shadow-sm" : "text-slate-500"
            }`}
          >
            {t("Login with Phone")}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("email");
              setIdentifier("");
            }}
            className={`flex-1 rounded-md py-1.5 transition ${
              mode === "email" ? "bg-white text-primary shadow-sm" : "text-slate-500"
            }`}
          >
            {t("Login with Email")}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="parent-identifier" className="mb-1 block text-sm font-medium text-slate-700">
              {mode === "phone" ? "Phone number" : "Email address"}
            </label>
            <input
              id="parent-identifier"
              type={mode === "phone" ? "tel" : "email"}
              required
              placeholder={mode === "phone" ? "+998901234567" : "you@example.com"}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label htmlFor="parent-password" className="mb-1 block text-sm font-medium text-slate-700">
              {t("Password")}
            </label>
            <input
              id="parent-password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={parentLogin.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-base font-medium text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
          >
            {parentLogin.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Login")}
          </button>

          <p className="text-center text-xs text-slate-400">
            Demo login: parent@example.com / Parent123!
          </p>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="font-medium text-primary hover:text-primary/80">
            ← Back to main login
          </Link>
        </div>
      </div>
    </div>
  );
}
