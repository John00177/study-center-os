import { useMemo, useState } from "react";
import type { NotificationType } from "@crm/shared-types";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { useNotificationRecipients, useSendNotification } from "../../hooks/use-notifications";
import { useTranslation } from "../../hooks/use-translation";

const TYPE_OPTIONS: NotificationType[] = ["info", "success", "warning"];

/**
 * Recipient list comes from GET /notifications/recipients, which the server
 * derives from the caller's role (owner/admin -> teachers + reception,
 * reception -> teachers, teacher -> their own students). The same query
 * re-validates the send, so this picker is convenience, not the security
 * boundary.
 */
export function SendNotificationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: recipients, isLoading } = useNotificationRecipients(open);
  const sendNotification = useSendNotification();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("info");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const byGroup = new Map<string, typeof recipients>();
    for (const r of recipients ?? []) {
      const list = byGroup.get(r.group) ?? [];
      list.push(r);
      byGroup.set(r.group, list);
    }
    return [...byGroup.entries()];
  }, [recipients]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setTitle("");
    setMessage("");
    setType("info");
    setSelected(new Set());
  }

  async function handleSend() {
    if (!title.trim() || !message.trim() || selected.size === 0) return;
    try {
      const result = await sendNotification.mutateAsync({
        title: title.trim(),
        message: message.trim(),
        recipientIds: [...selected],
        type,
      });
      showToast(`${t("notificationSent")} (${result.sentCount})`);
      reset();
      onClose();
    } catch {
      showToast(t("Failed to send notification."), "error");
    }
  }

  const canSend = title.trim() && message.trim() && selected.size > 0 && !sendNotification.isPending;

  return (
    <Modal open={open} onClose={onClose} title={t("sendNotification")} widthClassName="max-w-lg">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("title")}
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("message")}
          </label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("Type")}
          </label>
          <div className="flex gap-2">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                  type === option
                    ? "bg-primary text-white"
                    : "border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("recipients")} ({selected.size})
            </label>
            {(recipients?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() =>
                  setSelected((prev) =>
                    prev.size === recipients!.length ? new Set() : new Set(recipients!.map((r) => r.id)),
                  )
                }
                className="text-xs font-medium text-primary hover:underline"
              >
                {selected.size === recipients?.length ? t("clearSelection") : t("selectAll")}
              </button>
            )}
          </div>

          {isLoading && <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">{t("loading")}</p>}

          {!isLoading && (recipients?.length ?? 0) === 0 && (
            <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">{t("noRecipients")}</p>
          )}

          {!isLoading && grouped.length > 0 && (
            <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              {grouped.map(([group, list]) => (
                <div key={group}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {group}
                  </p>
                  <div className="space-y-1">
                    {(list ?? []).map((r) => (
                      <label
                        key={r.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                      >
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                        {r.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {t("send")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
