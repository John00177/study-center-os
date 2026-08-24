import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useToast } from "../components/Toast";
import { useOnlineStatus } from "./use-online-status";
import { getQueuedAttendanceActions, removeQueuedAttendanceAction } from "../lib/offline-queue";

export function useSyncOfflineQueue() {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const syncing = useRef(false);

  useEffect(() => {
    if (!isOnline || syncing.current) return;

    const queued = getQueuedAttendanceActions();
    if (queued.length === 0) return;

    syncing.current = true;
    (async () => {
      let synced = 0;
      for (const action of queued) {
        try {
          await api.post(`/teacher/groups/${action.groupId}/attendance`, {
            date: action.date,
            records: action.records,
          });
          removeQueuedAttendanceAction(action.id);
          synced += 1;
        } catch {
          // Leave it queued — will retry on the next reconnect.
        }
      }
      if (synced > 0) {
        queryClient.invalidateQueries({ queryKey: ["teacher"] });
        showToast(`Synced ${synced} offline attendance record${synced > 1 ? "s" : ""}.`);
      }
      syncing.current = false;
    })();
  }, [isOnline, queryClient, showToast]);
}
