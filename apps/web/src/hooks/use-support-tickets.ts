import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTicketInput, SupportTicketDto, TicketSummaryDto, UpdateTicketInput } from "@crm/shared-types";
import { api } from "../lib/api";

/**
 * Every hook here is parameterized by `basePath` — the portal-specific
 * prefix ("support-tickets" for staff, "student/support-tickets" for the
 * student portal, "parent/support-tickets" for parent, "admin/support-tickets"
 * for platform admin) — rather than four near-duplicate hook sets, since the
 * shapes are identical and only the URL differs.
 */

export function useCreateTicket(basePath: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTicketInput) => (await api.post<SupportTicketDto>(`/${basePath}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [basePath] }),
  });
}

export function useMyTickets(basePath: string, enabled = true) {
  return useQuery({
    queryKey: [basePath, "my"],
    queryFn: async () => (await api.get<SupportTicketDto[]>(`/${basePath}/my`)).data,
    enabled,
  });
}

export function useOpenTicketCount(basePath: string, enabled = true) {
  const { data } = useMyTickets(basePath, enabled);
  return data?.filter((t) => t.status === "open" || t.status === "in_progress").length ?? 0;
}

export interface TicketFilters {
  status?: string;
  type?: string;
  priority?: string;
  organizationId?: string;
  search?: string;
}

export function useTicketList(basePath: string, filters: TicketFilters = {}) {
  return useQuery({
    queryKey: [basePath, "list", filters],
    queryFn: async () => (await api.get<SupportTicketDto[]>(`/${basePath}`, { params: filters })).data,
  });
}

export function useTicketSummary(basePath: string) {
  return useQuery({
    queryKey: [basePath, "summary"],
    queryFn: async () => (await api.get<TicketSummaryDto>(`/${basePath}/summary`)).data,
  });
}

export function useTicket(basePath: string, id: string | null) {
  return useQuery({
    queryKey: [basePath, id],
    queryFn: async () => (await api.get<SupportTicketDto>(`/${basePath}/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useUpdateTicket(basePath: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTicketInput & { id: string }) =>
      (await api.patch<SupportTicketDto>(`/${basePath}/${id}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [basePath] }),
  });
}

export function useBulkUpdateTickets(basePath: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) =>
      (await api.post(`/${basePath}/bulk-update`, { ids, status })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [basePath] }),
  });
}
