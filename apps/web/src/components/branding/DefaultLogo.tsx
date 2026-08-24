/**
 * Fallback mark shown wherever an org hasn't uploaded a custom logo yet —
 * a simple graduation cap + book, colored via `currentColor` so wrapping it
 * in `text-primary` (or any text color class) recolors it for free.
 */
export function DefaultLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path
        d="M6 30V19.5L24 12l18 7.5V30"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 12 4 20l20 8 20-8-20-8Z" fill="currentColor" opacity="0.15" />
      <path d="M24 12 4 20l20 8 20-8-20-8Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M13 24.5V33c0 2.5 4.5 5 11 5s11-2.5 11-5v-8.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
