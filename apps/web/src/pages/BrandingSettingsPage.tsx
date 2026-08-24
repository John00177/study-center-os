import type { ThemeMode, UiLanguage } from "@crm/shared-types";
import { Loader2, Trash2, Upload } from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useState } from "react";
import { OrgLogo } from "../components/branding/OrgLogo";
import { useToast } from "../components/Toast";
import { SelectField } from "../components/form/Field";
import { useTheme } from "../contexts/ThemeContext";
import { useMyBranding, useUpdateBranding, useUploadLogo } from "../hooks/use-organizations";
import { DEFAULT_ACCENT_COLOR, DEFAULT_PRIMARY_COLOR } from "../lib/theme";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "auto", label: "Auto (system preference)" },
];

const LANGUAGE_OPTIONS: { value: UiLanguage; label: string }[] = [
  { value: "uz", label: "Uzbek (O'zbekcha)" },
  { value: "en", label: "English" },
  { value: "ru", label: "Russian" },
];

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </div>
  );
}

export function BrandingSettingsPage() {
  const { showToast } = useToast();
  const { previewBranding } = useTheme();
  const { data: branding, isLoading } = useMyBranding();
  const updateBranding = useUpdateBranding();
  const uploadLogo = useUploadLogo();

  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [language, setLanguage] = useState<UiLanguage>("uz");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!branding) return;
    setPrimaryColor(branding.primaryColor ?? DEFAULT_PRIMARY_COLOR);
    setAccentColor(branding.accentColor ?? DEFAULT_ACCENT_COLOR);
    setTheme(branding.theme);
    setLanguage(branding.language);
  }, [branding]);

  function updateColors(next: { primaryColor?: string; accentColor?: string }) {
    if (next.primaryColor) setPrimaryColor(next.primaryColor);
    if (next.accentColor) setAccentColor(next.accentColor);
    previewBranding(next);
  }

  function resetToDefault() {
    setPrimaryColor(DEFAULT_PRIMARY_COLOR);
    setAccentColor(DEFAULT_ACCENT_COLOR);
    previewBranding({ primaryColor: DEFAULT_PRIMARY_COLOR, accentColor: DEFAULT_ACCENT_COLOR });
  }

  async function handleSave() {
    try {
      await updateBranding.mutateAsync({ primaryColor, accentColor, theme, language });
      showToast("Branding saved.");
    } catch {
      showToast("Failed to save branding.", "error");
    }
  }

  async function handleLogoFile(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      showToast("Logo must be a PNG, JPG, or WebP image.", "error");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      showToast("Logo must be under 2MB.", "error");
      return;
    }
    try {
      await uploadLogo.mutateAsync(file);
      showToast("Logo uploaded.");
    } catch {
      showToast("Failed to upload logo.", "error");
    }
  }

  async function handleRemoveLogo() {
    try {
      await updateBranding.mutateAsync({ logoUrl: null });
      showToast("Logo removed.");
    } catch {
      showToast("Failed to remove logo.", "error");
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    void handleLogoFile(e.dataTransfer.files[0]);
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    void handleLogoFile(e.target.files?.[0]);
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Branding</h1>
        <p className="text-sm text-slate-600">Make {branding?.name ?? "your study center"} feel like your own.</p>
      </div>

      <SectionCard title="Logo">
        <div className="flex flex-wrap items-center gap-6">
          <OrgLogo logoUrl={branding?.logoUrl} name={branding?.name} className="h-16 w-16 rounded-lg border border-slate-200 p-2" />
          <div className="flex-1">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${
                dragOver ? "border-primary bg-primary/5" : "border-slate-300 hover:border-slate-400"
              }`}
            >
              <label htmlFor="logo-upload" className="flex cursor-pointer flex-col items-center gap-2">
                {uploadLogo.isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <Upload className="h-6 w-6 text-slate-400" />
                )}
                <span className="text-sm font-medium text-slate-700">Drag & drop or click to upload</span>
                <span className="text-xs text-slate-400">PNG, JPG, or WebP. Max 2MB.</span>
              </label>
              <input id="logo-upload" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileInput} />
            </div>
            {branding?.logoUrl && (
              <button
                onClick={handleRemoveLogo}
                disabled={updateBranding.isPending}
                className="mt-3 flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Remove Logo
              </button>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Colors">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => updateColors({ primaryColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-md border border-slate-300"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => updateColors({ primaryColor: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => updateColors({ accentColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-md border border-slate-300"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => updateColors({ accentColor: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <button className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm">Primary Button</button>
            <span className="inline-flex items-center rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">
              Accent Badge
            </span>
          </div>
          <button onClick={resetToDefault} className="text-sm font-medium text-slate-500 hover:text-slate-700">
            Reset to Default
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Theme">
        <div className="flex flex-wrap gap-4">
          {THEME_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="theme"
                checked={theme === opt.value}
                onChange={() => setTheme(opt.value)}
                className="accent-primary"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Language">
        <SelectField
          label="UI Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value as UiLanguage)}
          helperText="Sets the UI language preference. Full translation is future work."
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>
      </SectionCard>

      <SectionCard title="Preview">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 border-b border-primary/10 bg-primary/5 px-4 py-3">
            <OrgLogo logoUrl={branding?.logoUrl} name={branding?.name} className="h-6 w-6" />
            <span className="text-sm font-semibold text-slate-900">{branding?.name ?? "Your Study Center"}</span>
          </div>
          <div className="flex flex-col items-center gap-3 bg-slate-100 p-6">
            <div className="h-1.5 w-full max-w-xs rounded-full bg-primary" />
            <div className="w-full max-w-xs rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex justify-center">
                <OrgLogo logoUrl={branding?.logoUrl} name={branding?.name} className="h-10 w-10" />
              </div>
              <p className="text-center text-sm font-bold text-slate-900">Welcome to {branding?.name ?? "Your Study Center"}</p>
              <button className="mt-3 w-full rounded-lg bg-primary py-2 text-sm font-medium text-white shadow-sm">Sign in</button>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateBranding.isPending}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
        >
          {updateBranding.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Branding
        </button>
      </div>
    </div>
  );
}
