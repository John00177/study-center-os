import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "../hooks/use-online-status";
import { useTranslation } from "../hooks/use-translation";

export function OfflineBanner() {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-medium text-white">
      <WifiOff className="h-3.5 w-3.5" />
      {t("Offline mode — changes will sync when you're back online.")}
    </div>
  );
}
