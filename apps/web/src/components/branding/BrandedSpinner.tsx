import { Loader2 } from "lucide-react";

/** The one spinner every loading state should use — colored with the active org's primary color. */
export function BrandedSpinner({ className = "h-5 w-5" }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin text-primary`} />;
}
