import { DefaultLogo } from "./DefaultLogo";

interface OrgLogoProps {
  logoUrl?: string | null;
  name?: string;
  className?: string;
}

/** Shows the org's uploaded logo image, or the DefaultLogo mark (in the primary color) if none is set. */
export function OrgLogo({ logoUrl, name, className = "h-8 w-8" }: OrgLogoProps) {
  if (logoUrl) {
    return <img src={logoUrl} alt={name ? `${name} logo` : "Logo"} className={`${className} object-contain`} />;
  }
  return <DefaultLogo className={`${className} text-primary`} />;
}
