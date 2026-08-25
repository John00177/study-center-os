import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationListDto, UnreadCountDto } from "@crm/shared-types";
import { api } from "../lib/api";

export interface RegisterPushTokenInput {
  token: string;
  platform: "ios" | "android" | "web";
}

export function useRegisterPushToken() {
  return useMutation({
    mutationFn: async (input: RegisterPushTokenInput) => (await api.post("/users/push-token", input)).data,
  });
}

// ---- In-app notification feed (bell icon) — distinct from the mock push
// token registration above, which targets a device, not this persisted list.

function invalidateNotificationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

export function useNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["notifications", "list", page, limit],
    queryFn: async () => (await api.get<NotificationListDto>("/notifications", { params: { page, limit } })).data,
    placeholderData: (previous) => previous,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.patch(`/notifications/${id}/read`)).data,
    onSuccess: () => invalidateNotificationQueries(queryClient),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.patch("/notifications/read-all")).data,
    onSuccess: () => invalidateNotificationQueries(queryClient),
  });
}

export function useDismissNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/notifications/${id}`)).data,
    onSuccess: () => invalidateNotificationQueries(queryClient),
  });
}

export function useDismissAllNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.delete("/notifications/dismiss-all")).data,
    onSuccess: () => invalidateNotificationQueries(queryClient),
  });
}

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => (await api.get<UnreadCountDto>("/notifications/unread-count")).data,
    enabled,
    refetchInterval: 30_000,
  });
}
