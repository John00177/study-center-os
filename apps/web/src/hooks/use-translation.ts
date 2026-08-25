import { useLanguage } from "../contexts/LanguageContext";
import { translations, type TranslationKey } from "../i18n/translations";

export function useTranslation() {
  const { language } = useLanguage();

  function t(key: TranslationKey): string {
    return translations[language]?.[key] ?? translations.en[key] ?? key;
  }

  return { t, language };
}
