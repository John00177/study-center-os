import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { RoleLoginCard } from "../components/auth/RoleLoginCard";
import { useRoleLogin } from "../hooks/use-role-login";
import { useTheme } from "../contexts/ThemeContext";

export function TeacherLoginPage() {
  const { branding } = useTheme();
  const { email, setEmail, password, setPassword, error, loading, handleSubmit } = useRoleLogin(
    "/auth/teacher-login",
    "/teacher",
  );

  return (
    <RoleLoginCard
      title="Teacher Portal"
      subtitle="Access your classes and attendance"
      icon={<GraduationCap className="h-8 w-8 text-primary" />}
      orgName={branding?.name}
      logoUrl={branding?.logoUrl}
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      demoHint="Demo login: john@democenter.com / TeacherPass123!"
      footer={
        <Link to="/login" className="font-medium text-primary hover:text-primary/80">
          ← Back to Owner Login
        </Link>
      }
    />
  );
}
