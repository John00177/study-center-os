import { useEffect, useState } from "react";

function readIsDark() {
  return document.documentElement.classList.contains("dark");
}

/** Tracks the `dark` class on <html>, which ThemeContext/useDarkModePreference toggle. */
export function useIsDark() {
  const [isDark, setIsDark] = useState(readIsDark);

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(readIsDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
