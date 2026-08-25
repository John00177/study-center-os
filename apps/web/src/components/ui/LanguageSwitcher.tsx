import { useLanguage, type Language } from "../../contexts/LanguageContext";
import { useTranslation } from "../../hooks/use-translation";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "uz", label: "UZ" },
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
];

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className="flex items-center gap-0.5 rounded-md border border-slate-200 p-0.5 dark:border-slate-700"
      role="group"
      aria-label={t("Language")}
    >
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          aria-pressed={language === code}
          className={`rounded px-1.5 py-0.5 text-xs font-medium transition ${
            language === code
              ? "bg-primary text-white"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
