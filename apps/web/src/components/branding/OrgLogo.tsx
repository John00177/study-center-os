import { DefaultLogo } from "./DefaultLogo";

interface OrgLogoProps {
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  name?: string | null;
  className?: string;
}

/**
 * Shows the org's uploaded logo image, or the DefaultLogo mark (in the
 * primary color) if none is set. When a dark-mode variant is configured,
 * both are rendered and toggled via Tailwind's `dark:` class (which
 * applyThemeMode flips on <html>) rather than JS state, so it stays in sync
 * with theme changes for free.
 */
export function OrgLogo({ logoUrl, logoDarkUrl, name, className = "h-8 w-8" }: OrgLogoProps) {
  const alt = name ? `${name} logo` : "Logo";

  if (logoUrl && logoDarkUrl && logoUrl !== logoDarkUrl) {
    return (
      <>
        <img src={logoUrl} alt={alt} className={`${className} object-contain dark:hidden`} />
        <img src={logoDarkUrl} alt={alt} className={`hidden object-contain dark:block ${className}`} />
      </>
    );
  }

  if (logoUrl || logoDarkUrl) {
    return <img src={logoUrl ?? logoDarkUrl ?? undefined} alt={alt} className={`${className} object-contain`} />;
  }

  return <DefaultLogo className={`${className} text-primary`} />;
}
