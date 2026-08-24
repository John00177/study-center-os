import { create } from "zustand";
import type { AuthenticatedUserDto } from "@crm/shared-types";
import { resetActiveOrganizationSlug } from "../lib/api";

interface AuthState {
  user: AuthenticatedUserDto | null;
  setUser: (user: AuthenticatedUserDto | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => {
    resetActiveOrganizationSlug();
    set({ user: null });
  },
}));

export function useUserRole(): string | null {
  return useAuthStore((state) => state.user?.role ?? null);
}

export function useIsTeacherDashboardActive(): boolean {
  return useAuthStore((state) => state.user?.isTeacherDashboardActive ?? false);
}

export function useIsPlatformAdmin(): boolean {
  return useAuthStore((state) => state.user?.isPlatformAdmin ?? false);
}
