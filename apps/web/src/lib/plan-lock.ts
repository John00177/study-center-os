export interface PlanLockInfo {
  requiredPlan: string;
  message: string;
}

interface AxiosLikeError {
  response?: { status?: number; data?: { message?: string } };
}

// Duck-typed rather than `instanceof AxiosError` — Vite's dev-mode module
// graph can end up with two separate axios module instances (one resolved
// via a direct import, one via a transitive one), which gives two distinct
// AxiosError classes and makes `instanceof` unreliable across that boundary.
function isAxiosLikeError(error: unknown): error is AxiosLikeError {
  return typeof error === "object" && error !== null && "response" in error;
}

/** Extracts a backend-provided error message (e.g. a plan-limit message), falling back otherwise. */
export function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosLikeError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  return fallback;
}

/** Recognizes the friendly 403 messages SubscriptionGuard/SubscriptionLimitsService throw. */
export function parsePlanLockError(error: unknown): PlanLockInfo | null {
  if (!isAxiosLikeError(error) || error.response?.status !== 403) {
    return null;
  }
  const message = error.response?.data?.message;
  if (!message) return null;

  const match = message.match(/requires the (\w+) plan/i);
  if (!match) return null;

  return { requiredPlan: match[1], message };
}
