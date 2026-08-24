import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OverdueChargeDto, ReminderDto, ReminderStatsDto, ReminderType } from "@crm/shared-types";
import { api } from "../lib/api";

export interface OverdueChargesFilters {
  branchId?: string;
  minDaysOverdue?: number;
}

export function useOverdueCharges(filters: OverdueChargesFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ["reminders", "overdue", filters],
    queryFn: async () =>
      (await api.get<OverdueChargeDto[]>("/reminders/overdue", { params: filters })).data,
    enabled,
  });
}

export function useReminderHistory() {
  return useQuery({
    queryKey: ["reminders", "history"],
    queryFn: async () => (await api.get<ReminderDto[]>("/reminders/history")).data,
  });
}

export function useStudentReminderHistory(studentId: string | null) {
  return useQuery({
    queryKey: ["reminders", "history", "student", studentId],
    queryFn: async () =>
      (await api.get<ReminderDto[]>("/reminders/history", { params: { studentId } })).data,
    enabled: Boolean(studentId),
  });
}

export function useReminderStats() {
  return useQuery({
    queryKey: ["reminders", "stats"],
    queryFn: async () => (await api.get<ReminderStatsDto>("/reminders/stats")).data,
  });
}

export interface SendReminderInput {
  chargeId: string;
  type: ReminderType;
}

export function useSendReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendReminderInput) =>
      (await api.post<ReminderDto>("/reminders/send", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
  });
}
