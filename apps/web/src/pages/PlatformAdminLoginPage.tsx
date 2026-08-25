import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { RoleLoginCard } from "../components/auth/RoleLoginCard";
import { useRoleLogin } from "../hooks/use-role-login";
import { useTranslation } from "../hooks/use-translation";

export function PlatformAdminLoginPage() {
  const { t } = useTranslation();
  const { email, setEmail, password, setPassword, error, loading, handleSubmit } = useRoleLogin(
    "/auth/platform-login",
    "/admin",
  );

  return (
    <RoleLoginCard
      title={t("Platform Admin")}
      subtitle={t("Study Center OS Management")}
      icon={<ShieldCheck className="h-8 w-8 text-indigo-400" />}
      dark
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      demoHint={t("Demo login: admin@studycenter.uz / AdminPass123!")}
      footer={
        <Link to="/login" className="font-medium text-slate-400 hover:text-slate-200">
          ← Back to Owner Login
        </Link>
      }
    />
  );
}
