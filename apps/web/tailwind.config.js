/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // Modal composes "sm:" + widthClassName at runtime (full-screen on mobile,
  // capped width from sm: up), so the JIT scanner never sees those combined
  // class strings as source literals — safelist them explicitly.
  safelist: ["sm:max-w-lg", "sm:max-w-sm", "sm:max-w-xl"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Backed by CSS custom properties (see index.css / lib/theme.ts) so
        // an org's primaryColor/accentColor can repaint bg-primary,
        // text-primary/70, border-accent, etc. everywhere at runtime without
        // a rebuild — the rgb(... / <alpha-value>) form is what lets Tailwind's
        // opacity modifiers (bg-primary/10) keep working on a CSS var.
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
