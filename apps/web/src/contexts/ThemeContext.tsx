import type { OrganizationBrandingDto, OrganizationFullBrandingDto } from "@crm/shared-types";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuthStore } from "../stores/auth.store";
import { useMyBranding, usePublicBranding } from "../hooks/use-organizations";
import { applyBranding, applyThemeMode, getOrgSlugHint } from "../lib/theme";

interface ThemeContextValue {
  branding: OrganizationBrandingDto | OrganizationFullBrandingDto | null;
  isLoading: boolean;
  /** Live-preview colors before they're saved — used by the branding settings page. */
  previewBranding: (colors: { primaryColor?: string; accentColor?: string }) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Resolves and applies the active organization's branding as CSS custom
 * properties. Before login this is a best-effort guess (see getOrgSlugHint)
 * fetched via the public branding endpoint; once a staff user is signed in,
 * it switches to their actual org's full branding + theme/language prefs.
 * Platform admin is deliberately excluded — see PlatformAdminLayout, which
 * never renders inside this provider's branded surfaces.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const isStaffLoggedIn = Boolean(user) && user?.role !== "platform_admin";

  const { data: publicBranding, isLoading: publicLoading } = usePublicBranding(!isStaffLoggedIn ? getOrgSlugHint() : null);
  const { data: myBranding, isLoading: myLoading } = useMyBranding(isStaffLoggedIn);

  const branding = isStaffLoggedIn ? myBranding : publicBranding;
  const isLoading = isStaffLoggedIn ? myLoading : publicLoading;

  useEffect(() => {
    if (user?.role === "platform_admin") return;
    applyBranding(branding);
    if (myBranding) applyThemeMode(myBranding.theme);
  }, [branding, myBranding, user?.role]);

  const [preview, setPreview] = useState<{ primaryColor?: string; accentColor?: string } | null>(null);
  useEffect(() => {
    if (!preview) return;
    applyBranding({ ...branding, ...preview });
  }, [preview, branding]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      branding: branding ? { ...branding, ...preview } : null,
      isLoading,
      previewBranding: (colors) => setPreview(colors),
    }),
    [branding, preview, isLoading],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
