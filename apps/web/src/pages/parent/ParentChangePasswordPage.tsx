import { useNavigate } from "react-router-dom";
import { ChangePasswordForm } from "../../components/auth/ChangePasswordForm";
import { useToast } from "../../components/Toast";
import { useParentChangePassword } from "../../hooks/use-auth";
import { useParentAuthStore } from "../../stores/parent-auth.store";
import { useTranslation } from "../../hooks/use-translation";

export function ParentChangePasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const parent = useParentAuthStore((state) => state.parent);
  const setParent = useParentAuthStore((state) => state.setParent);
  const changePassword = useParentChangePassword();

  return (
    <ChangePasswordForm
      onSubmit={(currentPassword, newPassword) => changePassword.mutateAsync({ currentPassword, newPassword })}
      onSuccess={() => {
        if (parent) setParent({ ...parent, mustChangePassword: false });
        showToast(t("Password updated! Redirecting..."));
        navigate("/parent");
      }}
    />
  );
}
