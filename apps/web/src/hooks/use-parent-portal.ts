import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  ParentAttendanceRecordDto,
  ParentDashboardDto,
  ParentHomeworkDto,
  ParentPaymentsDto,
  ParentScheduleDayDto,
  ParentSessionDto,
  ParentTeacherDto,
} from "@crm/shared-types";
import { api } from "../lib/api";

export interface ParentLoginInput {
  identifier: string;
  password: string;
}

export function useParentLogin() {
  return useMutation({
    mutationFn: async (input: ParentLoginInput) =>
      (await api.post<ParentSessionDto>("/auth/parent-login", input)).data,
  });
}

export function useParentLogout() {
  return useMutation({
    mutationFn: async () => (await api.post("/auth/parent-logout")).data,
  });
}

export function useParentMe(enabled = true) {
  return useQuery({
    queryKey: ["parent", "me"],
    queryFn: async () => (await api.get<ParentSessionDto>("/auth/parent-me")).data,
    enabled,
    retry: false,
  });
}

export function useParentDashboard() {
  return useQuery({
    queryKey: ["parent", "dashboard"],
    queryFn: async () => (await api.get<ParentDashboardDto>("/parent/dashboard")).data,
  });
}

export function useParentSchedule() {
  return useQuery({
    queryKey: ["parent", "schedule"],
    queryFn: async () => (await api.get<ParentScheduleDayDto[]>("/parent/schedule")).data,
  });
}

export function useParentAttendance() {
  return useQuery({
    queryKey: ["parent", "attendance"],
    queryFn: async () => (await api.get<ParentAttendanceRecordDto[]>("/parent/attendance")).data,
  });
}

export function useParentHomework() {
  return useQuery({
    queryKey: ["parent", "homework"],
    queryFn: async () => (await api.get<ParentHomeworkDto[]>("/parent/homework")).data,
  });
}

export function useParentTeachers() {
  return useQuery({
    queryKey: ["parent", "teachers"],
    queryFn: async () => (await api.get<ParentTeacherDto[]>("/parent/teachers")).data,
  });
}

export function useParentPayments() {
  return useQuery({
    queryKey: ["parent", "payments"],
    queryFn: async () => (await api.get<ParentPaymentsDto>("/parent/payments")).data,
  });
}
