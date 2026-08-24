import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  RecordSalaryPaymentInput,
  SalaryAnalyticsDto,
  SalaryPaymentDto,
  SetSalaryInput,
  TeacherOwnSalaryDto,
  TeacherSalaryLineDto,
} from "@crm/shared-types";
import { api } from "../lib/api";

export function useSalaries(enabled = true) {
  return useQuery({
    queryKey: ["salaries"],
    queryFn: async () => (await api.get<TeacherSalaryLineDto[]>("/salaries")).data,
    enabled,
  });
}

export function useSalaryAnalytics(enabled = true) {
  return useQuery({
    queryKey: ["salaries", "analytics"],
    queryFn: async () => (await api.get<SalaryAnalyticsDto>("/salaries/analytics")).data,
    enabled,
  });
}

export function useSalaryPaymentHistory(teacherSalaryId: string | null) {
  return useQuery({
    queryKey: ["salaries", teacherSalaryId, "payments"],
    queryFn: async () => (await api.get<SalaryPaymentDto[]>(`/salaries/${teacherSalaryId}/payments`)).data,
    enabled: Boolean(teacherSalaryId),
  });
}

export function useSetSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SetSalaryInput) => (await api.post<TeacherSalaryLineDto>("/salaries", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["salaries"] }),
  });
}

export function useRecordSalaryPayment(teacherSalaryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordSalaryPaymentInput) =>
      (await api.post(`/salaries/${teacherSalaryId}/pay`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["salaries"] }),
  });
}

export function useMarkAllSalariesPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/salaries/pay-all")).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["salaries"] }),
  });
}

export function useTeacherOwnSalary() {
  return useQuery({
    queryKey: ["teacher", "salary"],
    queryFn: async () => (await api.get<TeacherOwnSalaryDto | null>("/teacher/salary")).data,
  });
}
