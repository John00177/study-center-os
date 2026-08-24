import type { OrganizationBrandingDto } from "@crm/shared-types";
import { getActiveOrganizationSlug } from "./api";

export const DEFAULT_PRIMARY_COLOR = "#2563eb";
export const DEFAULT_ACCENT_COLOR = "#22c55e";

const DEFAULT_FAVICON_HREF = "/icon-192.png";
const DEFAULT_ORG_NAME = "Study Center OS";

/** displayName overrides the org's canonical `name` for anything user-facing, when set. */
export function resolveOrgDisplayName(branding: Partial<OrganizationBrandingDto> | null | undefined): string {
  return branding?.displayName || branding?.name || DEFAULT_ORG_NAME;
}

let currentPrimaryColor = DEFAULT_PRIMARY_COLOR;
let currentAccentColor = DEFAULT_ACCENT_COLOR;

/** Raw hex for contexts that can't consume a CSS var (e.g. SVG/canvas chart fills). */
export function getPrimaryColor(): string {
  return currentPrimaryColor;
}

export function getAccentColor(): string {
  return currentAccentColor;
}

/** "#2563eb" -> "37 99 235" — the space-separated form Tailwind's rgb(var(...) / <alpha-value>) pattern expects. */
function hexToRgbChannels(hex: string): string | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = match[1];
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/**
 * Applies an organization's brand colors as CSS custom properties on the
 * document root and swaps the favicon — this is the single place that turns
 * "an org has primaryColor #059669" into "the whole app looks emerald."
 * Falls back to the platform defaults for any field that's missing so a
 * freshly-signed-up org (no branding set yet) still renders sensibly.
 */
export function applyBranding(branding: Partial<OrganizationBrandingDto> | null | undefined) {
  const root = document.documentElement;

  const primary = hexToRgbChannels(branding?.primaryColor ?? DEFAULT_PRIMARY_COLOR) ?? hexToRgbChannels(DEFAULT_PRIMARY_COLOR)!;
  const accent = hexToRgbChannels(branding?.accentColor ?? DEFAULT_ACCENT_COLOR) ?? hexToRgbChannels(DEFAULT_ACCENT_COLOR)!;

  root.style.setProperty("--color-primary", primary);
  root.style.setProperty("--color-accent", accent);
  currentPrimaryColor = branding?.primaryColor || DEFAULT_PRIMARY_COLOR;
  currentAccentColor = branding?.accentColor || DEFAULT_ACCENT_COLOR;

  const faviconHref = branding?.faviconUrl || DEFAULT_FAVICON_HREF;
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  if (link.href !== faviconHref) {
    link.href = faviconHref;
  }

  document.title = resolveOrgDisplayName(branding);
}

/**
 * Which org's branding a login page should show before anyone is
 * authenticated. There's no real subdomain routing in this app's dev/single-
 * origin setup, so ?org= in the URL stands in for it; falls through to
 * whichever org the api client last talked to (getActiveOrganizationSlug
 * already defaults that to the demo org).
 */
export function getOrgSlugHint(): string {
  const fromQuery = new URLSearchParams(window.location.search).get("org");
  if (fromQuery) return fromQuery;

  const hostParts = window.location.hostname.split(".");
  if (hostParts.length >= 3 && hostParts[0] !== "www") {
    return hostParts[0];
  }

  return getActiveOrganizationSlug();
}

/** Light/dark/auto -> toggles the `dark` class Tailwind's dark: variant looks for. */
export function applyThemeMode(theme: string | undefined) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const shouldBeDark = theme === "dark" || (theme === "auto" && prefersDark);
  root.classList.toggle("dark", Boolean(shouldBeDark));
}
