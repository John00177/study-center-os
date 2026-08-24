import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.studycenter.os",
  appName: "Study Center OS",
  webDir: "dist",
  server: {
    // Points the native shell at the Vite dev server for local development.
    // Remove/override for production builds, which bundle `dist` directly.
    url: process.env.CAPACITOR_DEV_SERVER_URL ?? "http://localhost:5173",
    cleartext: true,
  },
};

export default config;
