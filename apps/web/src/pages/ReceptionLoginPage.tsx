import { Link } from "react-router-dom";
import { UserRound } from "lucide-react";
import { RoleLoginCard } from "../components/auth/RoleLoginCard";
import { useRoleLogin } from "../hooks/use-role-login";
import { useTheme } from "../contexts/ThemeContext";

export function ReceptionLoginPage() {
  const { branding } = useTheme();
  const { email, setEmail, password, setPassword, error, loading, handleSubmit } = useRoleLogin(
    "/auth/reception-login",
    "/reception",
  );

  return (
    <RoleLoginCard
      title="Reception Portal"
      subtitle="Manage newcomers and payments"
      icon={<UserRound className="h-8 w-8 text-primary" />}
      orgName={branding?.name}
      logoUrl={branding?.logoUrl}
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      demoHint="Demo login: reception@democenter.com / ReceptionPass123!"
      footer={
        <Link to="/login" className="font-medium text-primary hover:text-primary/80">
          ← Back to Owner Login
        </Link>
      }
    />
  );
}
