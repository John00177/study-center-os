import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CurrentSubscriptionDto, SubscriptionLimitsDto, SubscriptionPlanListItemDto } from "@crm/shared-types";
import { api } from "../lib/api";

export function useCurrentSubscription(enabled = true) {
  return useQuery({
    queryKey: ["subscription", "current"],
    queryFn: async () => (await api.get<CurrentSubscriptionDto>("/subscription/current")).data,
    enabled,
    retry: false,
  });
}

export function useSubscriptionLimits(enabled = true) {
  return useQuery({
    queryKey: ["subscription", "limits"],
    queryFn: async () => (await api.get<SubscriptionLimitsDto>("/subscription/limits")).data,
    enabled,
    retry: false,
  });
}

export function useSubscriptionPlans(enabled = true) {
  return useQuery({
    queryKey: ["subscription", "plans"],
    queryFn: async () => (await api.get<SubscriptionPlanListItemDto[]>("/subscription/plans")).data,
    enabled,
  });
}

export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => (await api.post<CurrentSubscriptionDto>("/subscription/upgrade", { planId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/subscription/cancel")).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscription"] }),
  });
}
