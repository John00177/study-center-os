import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ApplicationDto,
  OrganizationDetailDto,
  OrganizationSummaryDto,
  OrganizationStatus,
  PlatformHealthDto,
  PlatformRevenueDto,
  SubscriptionPlanDto,
} from "@crm/shared-types";
import { api } from "../lib/api";

export interface OrganizationsFilters {
  status?: OrganizationStatus;
  country?: string;
  plan?: string;
}

export function useOrganizations(filters: OrganizationsFilters = {}) {
  return useQuery({
    queryKey: ["platform", "organizations", filters],
    queryFn: async () => (await api.get<OrganizationSummaryDto[]>("/platform/organizations", { params: filters })).data,
  });
}

export function useOrganizationDetail(id: string | null) {
  return useQuery({
    queryKey: ["platform", "organizations", "detail", id],
    queryFn: async () => (await api.get<OrganizationDetailDto>(`/platform/organizations/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function usePlatformRevenue() {
  return useQuery({
    queryKey: ["platform", "revenue"],
    queryFn: async () => (await api.get<PlatformRevenueDto>("/platform/revenue")).data,
  });
}

export function usePlatformHealth() {
  return useQuery({
    queryKey: ["platform", "health"],
    queryFn: async () => (await api.get<PlatformHealthDto>("/platform/health")).data,
  });
}

export function useSuspendOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) =>
      (await api.post(`/platform/organizations/${id}/suspend`, { reason })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform"] }),
  });
}

export function useActivateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/platform/organizations/${id}/activate`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform"] }),
  });
}

export function useUpdateOrganizationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, hasBranches }: { id: string; hasBranches: boolean }) =>
      (await api.patch(`/platform/organizations/${id}/settings`, { hasBranches })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform"] }),
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["platform", "plans"],
    queryFn: async () => (await api.get<SubscriptionPlanDto[]>("/platform/plans")).data,
  });
}

export function usePendingApplications() {
  return useQuery({
    queryKey: ["platform", "applications"],
    queryFn: async () => (await api.get<ApplicationDto[]>("/platform/applications")).data,
  });
}

export function useApproveApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, planId, hasBranches }: { id: string; planId?: string; hasBranches?: boolean }) =>
      (await api.post(`/platform/applications/${id}/approve`, { planId, hasBranches })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform"] }),
  });
}

export function useRejectApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) =>
      (await api.post(`/platform/applications/${id}/reject`, { reason })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform"] }),
  });
}
