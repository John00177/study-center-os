import { useCallback } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { translations, type TranslationKey } from "../i18n/translations";
import { uiStrings } from "../i18n/ui-strings";

/**
 * Two key styles are supported, in this order:
 *
 *  1. Semantic keys ("dashboard", "save") — the original hand-curated set.
 *  2. The English string itself ("Reset password") — used by the project-wide
 *     sweep, so English needs no dictionary and any string that was missed or
 *     is newly added simply renders in English instead of leaking a raw key.
 */
export function useTranslation() {
  const { language } = useLanguage();

  const t = useCallback(
    (key: TranslationKey | (string & {})): string => {
      if (language === "en") {
        return (translations.en as Record<string, string>)[key] ?? key;
      }
      const semantic = (translations[language] as Record<string, string> | undefined)?.[key];
      if (semantic) return semantic;

      const ui = uiStrings[language]?.[key];
      if (ui) return ui;

      return (translations.en as Record<string, string>)[key] ?? key;
    },
    [language],
  );

  return { t, language };
}
