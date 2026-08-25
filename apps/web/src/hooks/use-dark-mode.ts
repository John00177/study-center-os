import { useCallback, useEffect, useState } from "react";
import {
  applyThemeMode,
  getStoredThemePreference,
  hasStoredThemePreference,
  setStoredThemePreference,
  type ThemePreference,
} from "../lib/theme";

/**
 * Personal light/dark/system override, persisted to localStorage. Only
 * re-applies the `dark` class once the user has actually touched the
 * toggle — until then, ThemeContext's org-branding effect owns it (see
 * applyThemeMode in lib/theme.ts for how the two are reconciled).
 */
export function useDarkModePreference() {
  const [preference, setPreference] = useState<ThemePreference>(() => getStoredThemePreference());

  useEffect(() => {
    if (!hasStoredThemePreference()) return;
    applyThemeMode(undefined);
    if (preference !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyThemeMode(undefined);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, [preference]);

  const setThemePreference = useCallback((next: ThemePreference) => {
    setStoredThemePreference(next);
    setPreference(next);
  }, []);

  return { preference, setThemePreference };
}
