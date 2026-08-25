import { useQuery } from "@tanstack/react-query";
import type { AuditLogDto, AuditLogListDto } from "@crm/shared-types";
import { api } from "../lib/api";

export interface AuditLogFilters {
  verb?: "created" | "updated" | "deleted" | "";
  entityType?: string;
  actorId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export function useAuditLog(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () =>
      (
        await api.get<AuditLogListDto>("/audit-logs", {
          params: { ...filters, verb: filters.verb || undefined },
        })
      ).data,
    placeholderData: (previous) => previous,
  });
}

export function useAuditLogEntityTypes() {
  return useQuery({
    queryKey: ["audit-logs", "entity-types"],
    queryFn: async () => (await api.get<string[]>("/audit-logs/entity-types")).data,
    staleTime: 60_000,
  });
}

export function useAuditLogEntry(id: string | null) {
  return useQuery({
    queryKey: ["audit-logs", id],
    queryFn: async () => (await api.get<AuditLogDto>(`/audit-logs/${id}`)).data,
    enabled: Boolean(id),
  });
}
