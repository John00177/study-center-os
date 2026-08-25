import { useNavigate } from "react-router-dom";
import { ChangePasswordForm } from "../../components/auth/ChangePasswordForm";
import { useToast } from "../../components/Toast";
import { useStudentChangePassword } from "../../hooks/use-auth";
import { useStudentAuthStore } from "../../stores/student-auth.store";
import { useTranslation } from "../../hooks/use-translation";

export function StudentChangePasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const student = useStudentAuthStore((state) => state.student);
  const setStudent = useStudentAuthStore((state) => state.setStudent);
  const changePassword = useStudentChangePassword();

  return (
    <ChangePasswordForm
      onSubmit={(currentPassword, newPassword) => changePassword.mutateAsync({ currentPassword, newPassword })}
      onSuccess={() => {
        if (student) setStudent({ ...student, mustChangePassword: false });
        showToast(t("Password updated! Redirecting..."));
        navigate("/student");
      }}
    />
  );
}
