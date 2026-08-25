import { Monitor, Moon, Sun } from "lucide-react";
import { useDarkModePreference } from "../../hooks/use-dark-mode";
import type { ThemePreference } from "../../lib/theme";

const CYCLE: ThemePreference[] = ["light", "dark", "system"];

const ICON_BY_PREFERENCE: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABEL_BY_PREFERENCE: Record<ThemePreference, string> = {
  light: "Light theme",
  dark: "Dark theme",
  system: "System theme",
};

export function ThemeToggle() {
  const { preference, setThemePreference } = useDarkModePreference();
  const Icon = ICON_BY_PREFERENCE[preference];

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(preference) + 1) % CYCLE.length];
    setThemePreference(next);
  }

  return (
    <button
      onClick={cycle}
      title={`${LABEL_BY_PREFERENCE[preference]} — click to change`}
      aria-label={`Theme: ${preference}. Click to change.`}
      className="flex items-center gap-1 rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      <Icon size={18} />
    </button>
  );
}
