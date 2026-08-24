import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import type { LoginResponseDto } from "@crm/shared-types";
import { api, setActiveOrganizationSlug, setIsPlatformAdmin } from "../lib/api";
import { useAuthStore } from "../stores/auth.store";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Invalid email or password.",
  ORG_PENDING: "Your application is pending approval. Please wait for admin confirmation.",
  ORG_SUSPENDED: "Your account has been suspended. Contact support.",
  TEACHER_DASHBOARD_INACTIVE: "Your teacher dashboard access has not been activated yet. Ask an admin to activate it.",
};

/** Shared submit mechanics for all 4 role-specific login pages — only the endpoint and redirect differ. */
export function useRoleLogin(endpoint: string, redirectTo: string) {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post<LoginResponseDto>(endpoint, { email, password });
      setIsPlatformAdmin(res.data.role === "platform_admin");
      if (res.data.organizationSlug) {
        setActiveOrganizationSlug(res.data.organizationSlug);
      }
      // The login response doesn't carry isTeacherDashboardActive (that's
      // resolved per-request) — fetch the enriched profile from /me before
      // navigating, or role-aware routing decides on stale data.
      const me = await api.get("/auth/me");
      setUser(me.data);
      navigate(redirectTo);
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as { code?: string; message?: string } | undefined;
        if (data?.code === "WRONG_ROLE") {
          setError(data.message ?? "This account can't sign in through this portal.");
        } else if (data?.code && ERROR_MESSAGES[data.code]) {
          setError(ERROR_MESSAGES[data.code]);
        } else if (err.response?.status === 401 || err.response?.status === 403) {
          setError(data?.message ?? "Invalid email or password.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return { email, setEmail, password, setPassword, error, loading, handleSubmit };
}
