import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { Building2, Loader2 } from "lucide-react";
import { RoleLoginCard } from "../components/auth/RoleLoginCard";
import { useRoleLogin } from "../hooks/use-role-login";
import { api } from "../lib/api";
import { useStudentAuthStore } from "../stores/student-auth.store";
import { useTheme } from "../contexts/ThemeContext";

function StudentLoginForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const setStudent = useStudentAuthStore((state) => state.setStudent);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/student-login", { identifier, password });
      setStudent(res.data);
      navigate("/student");
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        setError("Invalid phone/email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-1 text-center text-2xl font-semibold text-slate-900">Student Portal</h1>
        <p className="mb-6 text-center text-sm text-slate-500">Check your schedule, homework, and payments</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="mb-1 block text-sm font-medium text-slate-700">
              Phone or Email
            </label>
            <input
              id="identifier"
              type="text"
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label htmlFor="student-password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="student-password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </button>

          <p className="text-center text-xs text-slate-400">Demo login: +998901234567 / Student123!</p>
        </form>

        <div className="mt-6 text-center text-sm">
          <button type="button" onClick={onBack} className="font-medium text-primary hover:text-primary/80">
            ← Back to Owner Login
          </button>
        </div>
      </div>
    </div>
  );
}

export function OwnerLoginPage() {
  const [studentMode, setStudentMode] = useState(false);
  const { branding } = useTheme();
  const { email, setEmail, password, setPassword, error, loading, handleSubmit } = useRoleLogin(
    "/auth/owner-login",
    "/",
  );

  if (studentMode) {
    return <StudentLoginForm onBack={() => setStudentMode(false)} />;
  }

  return (
    <RoleLoginCard
      title="Study Center Owner Login"
      subtitle="Manage your study center"
      icon={<Building2 className="h-8 w-8 text-primary" />}
      orgName={branding?.name}
      logoUrl={branding?.logoUrl}
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      demoHint="Demo login: owner@democenter.com / DemoPass123!"
      footer={
        <>
          <Link to="/teacher/login" className="block font-medium text-primary hover:text-primary/80">
            Teacher Portal →
          </Link>
          <Link to="/reception/login" className="block font-medium text-primary hover:text-primary/80">
            Reception Portal →
          </Link>
          <button
            type="button"
            onClick={() => setStudentMode(true)}
            className="block w-full font-medium text-primary hover:text-primary/80"
          >
            Student Portal →
          </button>
          <Link to="/parent/login" className="block font-medium text-primary hover:text-primary/80">
            Parent Portal →
          </Link>
          <Link to="/platform/login" className="block font-medium text-slate-400 hover:text-slate-600">
            Platform Admin →
          </Link>
          <p className="pt-2 text-slate-500">
            New study center?{" "}
            <Link to="/signup" className="font-medium text-primary hover:text-primary/80">
              Register your center
            </Link>
          </p>
        </>
      }
    />
  );
}
