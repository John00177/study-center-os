import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChargeDto,
  ChargesSortBy,
  ChargeStatus,
  FinancialAccountDto,
  PaymentDto,
  PaymentSummaryDto,
} from "@crm/shared-types";
import { api } from "../lib/api";

export function useFinancialAccounts() {
  return useQuery({
    queryKey: ["finance", "accounts"],
    queryFn: async () => (await api.get<FinancialAccountDto[]>("/finance/accounts")).data,
  });
}

export interface ChargesFilters {
  sortBy?: ChargesSortBy;
  status?: ChargeStatus;
  studentId?: string;
  groupId?: string;
}

export function useCharges(filters: ChargesFilters = {}) {
  return useQuery({
    queryKey: ["finance", "charges", filters],
    queryFn: async () => (await api.get<ChargeDto[]>("/finance/charges", { params: filters })).data,
  });
}

export function useOverdueFinanceCharges() {
  return useQuery({
    queryKey: ["finance", "charges", "overdue"],
    queryFn: async () => (await api.get<ChargeDto[]>("/finance/charges/overdue")).data,
  });
}

export function usePaymentSummary() {
  return useQuery({
    queryKey: ["finance", "summary"],
    queryFn: async () => (await api.get<PaymentSummaryDto>("/finance/summary")).data,
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ["finance", "payments"],
    queryFn: async () => (await api.get<PaymentDto[]>("/finance/payments")).data,
  });
}

export interface ChargeInput {
  branchId: string;
  studentId: string;
  amount: number;
  currency?: string;
  description?: string;
  dueDate: string;
}

export function useCreateCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChargeInput) => (await api.post<ChargeDto>("/finance/charges", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance"] }),
  });
}

export function useDeleteCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/finance/charges/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance"] }),
  });
}

export interface PaymentInput {
  branchId: string;
  studentId: string;
  financialAccountId: string;
  amount: number;
  currency?: string;
  paymentMethod: string;
  reference?: string;
  chargeId?: string;
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PaymentInput) => (await api.post<PaymentDto>("/finance/payments", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      // A payment can settle a charge (via chargeId), which changes which
      // charges are overdue — the Overdue Payments page reads that list from
      // a separate query key (see use-reminders.ts), so it needs its own
      // invalidation or "Mark Paid" there wouldn't auto-refresh the table.
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/finance/payments/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance"] }),
  });
}
