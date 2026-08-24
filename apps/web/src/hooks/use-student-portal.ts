import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  StudentAttendanceRecordDto,
  StudentDashboardDto,
  StudentHomeworkDto,
  StudentPaymentsDto,
  StudentScheduleDayDto,
  StudentSessionDto,
} from "@crm/shared-types";
import { api } from "../lib/api";

export interface StudentLoginInput {
  identifier: string;
  password: string;
}

export function useStudentLogin() {
  return useMutation({
    mutationFn: async (input: StudentLoginInput) =>
      (await api.post<StudentSessionDto>("/auth/student-login", input)).data,
  });
}

export function useStudentLogout() {
  return useMutation({
    mutationFn: async () => (await api.post("/auth/student-logout")).data,
  });
}

export function useStudentMe(enabled = true) {
  return useQuery({
    queryKey: ["student", "me"],
    queryFn: async () => (await api.get<StudentSessionDto>("/auth/student-me")).data,
    enabled,
    retry: false,
  });
}

export function useStudentDashboard() {
  return useQuery({
    queryKey: ["student", "dashboard"],
    queryFn: async () => (await api.get<StudentDashboardDto>("/student/dashboard")).data,
  });
}

export function useStudentPortalSchedule() {
  return useQuery({
    queryKey: ["student", "schedule"],
    queryFn: async () => (await api.get<StudentScheduleDayDto[]>("/student/schedule")).data,
  });
}

export function useStudentPortalAttendance() {
  return useQuery({
    queryKey: ["student", "attendance"],
    queryFn: async () => (await api.get<StudentAttendanceRecordDto[]>("/student/attendance")).data,
  });
}

export function useStudentPortalHomework() {
  return useQuery({
    queryKey: ["student", "homework"],
    queryFn: async () => (await api.get<StudentHomeworkDto[]>("/student/homework")).data,
  });
}

export function useStudentPortalPayments() {
  return useQuery({
    queryKey: ["student", "payments"],
    queryFn: async () => (await api.get<StudentPaymentsDto>("/student/payments")).data,
  });
}
