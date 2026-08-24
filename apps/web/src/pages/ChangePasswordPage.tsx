import { useNavigate } from "react-router-dom";
import { ChangePasswordForm } from "../components/auth/ChangePasswordForm";
import { useToast } from "../components/Toast";
import { useChangePassword } from "../hooks/use-auth";
import { useAuthStore } from "../stores/auth.store";

const REDIRECT_BY_ROLE: Record<string, string> = {
  teacher: "/teacher",
  reception: "/reception",
};

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const changePassword = useChangePassword();

  return (
    <ChangePasswordForm
      onSubmit={(currentPassword, newPassword) => changePassword.mutateAsync({ currentPassword, newPassword })}
      onSuccess={() => {
        if (user) setUser({ ...user, mustChangePassword: false });
        showToast("Password updated! Redirecting...");
        navigate(REDIRECT_BY_ROLE[user?.role ?? ""] ?? "/");
      }}
    />
  );
}
