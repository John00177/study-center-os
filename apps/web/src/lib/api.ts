import axios from "axios";

export const DEFAULT_ORGANIZATION_SLUG = "demo-center";
const ORG_SLUG_STORAGE_KEY = "crm-os:active-org-slug";
const IS_PLATFORM_ADMIN_STORAGE_KEY = "crm-os:is-platform-admin";

// Every login response tells the frontend which org the logged-in user
// belongs to (see auth.controller.ts's role-specific login endpoints) — a
// fresh signup's slug is never this app's hardcoded default, so the header
// has to be dynamic rather than a fixed constant like it was before
// self-service signup.
let activeOrganizationSlug = localStorage.getItem(ORG_SLUG_STORAGE_KEY) ?? DEFAULT_ORGANIZATION_SLUG;
// Platform admin spans every organization — it never sends x-organization-id
// at all (see PlatformAdminGuard, which doesn't go through TenancyGuard).
let isPlatformAdmin = localStorage.getItem(IS_PLATFORM_ADMIN_STORAGE_KEY) === "true";

/** Read-only peek at the slug the api client is currently sending — used by ThemeProvider to fetch branding before/without a session. */
export function getActiveOrganizationSlug(): string {
  return activeOrganizationSlug;
}

export function setActiveOrganizationSlug(slug: string) {
  activeOrganizationSlug = slug;
  localStorage.setItem(ORG_SLUG_STORAGE_KEY, slug);
}

export function setIsPlatformAdmin(value: boolean) {
  isPlatformAdmin = value;
  localStorage.setItem(IS_PLATFORM_ADMIN_STORAGE_KEY, String(value));
}

export function resetActiveOrganizationSlug() {
  activeOrganizationSlug = DEFAULT_ORGANIZATION_SLUG;
  isPlatformAdmin = false;
  localStorage.removeItem(ORG_SLUG_STORAGE_KEY);
  localStorage.removeItem(IS_PLATFORM_ADMIN_STORAGE_KEY);
}

// In dev, Vite proxies "/api" to the local API (see vite.config.ts) — that
// relative path also happens to work in prod if API and web are served from
// the same origin. VITE_API_URL overrides it for a split deployment (e.g.
// Railway, where web and api are separate services on separate origins).
const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (!isPlatformAdmin) {
    config.headers["x-organization-id"] = activeOrganizationSlug;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Boot-time auth probes (/auth/me, /auth/student-me) are EXPECTED to 401
    // for a logged-out visitor or the "wrong" session type — App.tsx's boot
    // check relies on catching that itself to try the other auth flow. A
    // blanket redirect here would race ahead of that fallback and bounce a
    // freshly-logged-in student straight back to /login.
    const isAuthProbe = typeof error.config?.url === "string" && error.config.url.includes("/auth/");
    if (error.response?.status === 401 && !isAuthProbe && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
