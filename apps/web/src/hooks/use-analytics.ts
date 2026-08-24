import { useQuery } from "@tanstack/react-query";
import type {
  AttendanceAnalyticsDto,
  EnrollmentAnalyticsDto,
  FinanceHealthDto,
  NewcomerConversionFunnelDto,
  QuickStatsDto,
  RevenueAnalyticsDto,
  TeacherAnalyticsDto,
} from "@crm/shared-types";
import { api } from "../lib/api";

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  branchId?: string;
}

export interface AttendanceAnalyticsFilters extends AnalyticsFilters {
  groupId?: string;
}

export function useRevenueAnalytics(filters: AnalyticsFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ["analytics", "revenue", filters],
    queryFn: async () => (await api.get<RevenueAnalyticsDto>("/analytics/revenue", { params: filters })).data,
    enabled,
  });
}

export function useEnrollmentAnalytics(filters: AnalyticsFilters = {}) {
  return useQuery({
    queryKey: ["analytics", "enrollment", filters],
    queryFn: async () => (await api.get<EnrollmentAnalyticsDto>("/analytics/enrollment", { params: filters })).data,
  });
}

export function useTeacherAnalytics(filters: AnalyticsFilters = {}) {
  return useQuery({
    queryKey: ["analytics", "teachers", filters],
    queryFn: async () => (await api.get<TeacherAnalyticsDto>("/analytics/teachers", { params: filters })).data,
  });
}

export function useAttendanceAnalytics(filters: AttendanceAnalyticsFilters = {}) {
  return useQuery({
    queryKey: ["analytics", "attendance", filters],
    queryFn: async () => (await api.get<AttendanceAnalyticsDto>("/analytics/attendance", { params: filters })).data,
  });
}

export function useFinanceHealth(enabled = true) {
  return useQuery({
    queryKey: ["analytics", "finance-health"],
    queryFn: async () => (await api.get<FinanceHealthDto>("/analytics/finance-health")).data,
    enabled,
  });
}

export function useQuickStats() {
  return useQuery({
    queryKey: ["analytics", "quick-stats"],
    queryFn: async () => (await api.get<QuickStatsDto>("/analytics/quick-stats")).data,
  });
}

export function useNewcomerConversionFunnel() {
  return useQuery({
    queryKey: ["analytics", "newcomer-funnel"],
    queryFn: async () => (await api.get<NewcomerConversionFunnelDto>("/analytics/newcomer-funnel")).data,
  });
}
