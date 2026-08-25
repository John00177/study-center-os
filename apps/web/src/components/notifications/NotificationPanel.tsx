import type { NotificationDto, NotificationType } from "@crm/shared-types";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../hooks/use-translation";
import {
  useDismissAllNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../../hooks/use-notifications";

const TYPE_ICONS: Record<NotificationType, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const TYPE_ICON_CLASSES: Record<NotificationType, string> = {
  success: "text-green-500",
  warning: "text-yellow-500",
  error: "text-red-500",
  info: "text-blue-500",
};

// Where clicking a notification's entityType/entityId should navigate.
// isPlatformAdmin matters for support_ticket: platform admins live under
// /admin/support-tickets, not the org-facing /support-tickets — and
// support_ticket is the only entityType a platform admin ever receives
// (student/payment/attendance/salary notifications are org-staff only).
function entityRoute(entityType: string | null | undefined, entityId: string | null | undefined, isPlatformAdmin: boolean): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "student":
      return `/students/${entityId}/profile`;
    case "payment":
      return "/finance";
    case "attendance":
      return "/attendance";
    case "salary":
      return "/teachers/salaries";
    case "support_ticket":
      return isPlatformAdmin ? "/admin/support-tickets" : "/support-tickets";
    default:
      return null;
  }
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString();
}

// Two fixed palettes rather than dark: variants — forceDark is for surfaces
// (the platform admin shell) that are always dark with no `dark` class on
// <html>, so dark: variants there would never activate.
function paletteFor(forceDark: boolean) {
  return forceDark
    ? {
        panel: "border-slate-700 bg-slate-800",
        header: "border-slate-700 bg-slate-800",
        headerText: "text-slate-100",
        link: "text-indigo-400 hover:text-indigo-300",
        muted: "text-slate-400",
        divide: "divide-slate-700",
        rowReadHover: "hover:bg-slate-700/50",
        rowUnread: "border-blue-500 bg-slate-700 hover:bg-slate-700/70",
        title: "text-slate-100",
        message: "text-slate-400",
        footerBorder: "border-slate-700",
        footerHover: "hover:bg-slate-700/50",
      }
    : {
        panel: "border-gray-200 bg-white",
        header: "border-gray-200 bg-white",
        headerText: "text-slate-900",
        link: "text-indigo-600 hover:text-indigo-700",
        muted: "text-slate-500",
        divide: "divide-gray-100",
        rowReadHover: "hover:bg-slate-50",
        rowUnread: "border-blue-500 bg-blue-50 hover:bg-blue-100",
        title: "text-slate-900",
        message: "text-slate-500",
        footerBorder: "border-gray-200",
        footerHover: "hover:bg-slate-50",
      };
}

type Palette = ReturnType<typeof paletteFor>;

function NotificationRow({
  notification,
  onNavigate,
  palette,
  isPlatformAdmin,
}: {
  notification: NotificationDto;
  onNavigate: () => void;
  palette: Palette;
  isPlatformAdmin: boolean;
}) {
  const markAsRead = useMarkNotificationRead();
  const navigate = useNavigate();
  const Icon = TYPE_ICONS[notification.type];

  function handleClick() {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    const route = entityRoute(notification.entityType, notification.entityId, isPlatformAdmin);
    if (route) {
      navigate(route);
      onNavigate();
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`flex w-full items-start gap-2.5 border-l-4 px-3 py-2.5 text-left transition ${
        notification.read ? `border-transparent ${palette.rowReadHover}` : palette.rowUnread
      }`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${TYPE_ICON_CLASSES[notification.type]}`} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${palette.title}`}>{notification.title}</p>
        <p className={`text-xs ${palette.message}`}>{notification.message}</p>
        <p className="mt-0.5 text-xs text-gray-400">
          {/* senderName is only set on person-to-person sends; system events show just the time. */}
          {notification.senderName ? `From: ${notification.senderName} · ` : ""}
          {relativeTime(notification.createdAt)}
        </p>
      </div>
    </button>
  );
}

export function NotificationPanel({ onClose, forceDark = false }: { onClose: () => void; forceDark?: boolean }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(page);
  const markAllAsRead = useMarkAllNotificationsRead();
  const dismissAll = useDismissAllNotifications();
  const palette = paletteFor(forceDark);

  const items = data?.items ?? [];

  return (
    <div className={`absolute right-0 z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border shadow-lg ${palette.panel}`}>
      <div className={`sticky top-0 flex items-center justify-between border-b px-3 py-2 ${palette.header}`}>
        <h3 className={`text-sm font-semibold ${palette.headerText}`}>{t("Notifications")}</h3>
        {items.some((n) => !n.read) && (
          <button
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className={`text-xs font-medium disabled:opacity-60 ${palette.link}`}
          >
            {t("Mark all as read")}
          </button>
        )}
      </div>

      {isLoading && <p className={`px-3 py-6 text-center text-sm ${palette.muted}`}>{t("Loading...")}</p>}

      {!isLoading && items.length === 0 && (
        <p className={`px-3 py-6 text-center text-sm ${palette.muted}`}>{t("No notifications")}</p>
      )}

      {!isLoading && items.length > 0 && (
        <div className={`divide-y ${palette.divide}`}>
          {items.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onNavigate={onClose}
              palette={palette}
              isPlatformAdmin={forceDark}
            />
          ))}
        </div>
      )}

      {data?.hasMore && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className={`w-full border-t py-2 text-xs font-medium ${palette.footerBorder} ${palette.link} ${palette.footerHover}`}
        >
          {t("Load more")}
        </button>
      )}

      {items.length > 0 && (
        <div className={`border-t ${palette.footerBorder}`}>
          <button
            onClick={() => dismissAll.mutate()}
            disabled={dismissAll.isPending}
            className={`w-full py-2 text-xs font-medium disabled:opacity-60 hover:text-red-600 ${palette.muted} ${palette.footerHover}`}
          >
            {t("Dismiss all")}
          </button>
        </div>
      )}
    </div>
  );
}
