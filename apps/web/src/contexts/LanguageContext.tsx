import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type Language = "uz" | "ru" | "en";

const LANGUAGE_STORAGE_KEY = "language-preference";

function getStoredLanguage(): Language {
  const stored = typeof window !== "undefined" ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
  return stored === "uz" || stored === "ru" || stored === "en" ? stored : "uz";
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * UI-only language preference for now — no translation strings are wired up
 * yet, this just persists the choice so the switcher has somewhere real to
 * write to. Actual i18n can layer on top of this context later.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => getStoredLanguage());

  const setLanguage = useCallback((lang: Language) => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    setLanguageState(lang);
  }, []);

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
