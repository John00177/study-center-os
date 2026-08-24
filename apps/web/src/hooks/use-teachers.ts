import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTeacherResultDto, TeacherDto, TempPasswordDto } from "@crm/shared-types";
import { api } from "../lib/api";

export function useTeachers() {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: async () => (await api.get<TeacherDto[]>("/teachers")).data,
  });
}

export function useTeacher(id: string | null) {
  return useQuery({
    queryKey: ["teachers", id],
    queryFn: async () => (await api.get<TeacherDto>(`/teachers/${id}`)).data,
    enabled: Boolean(id),
  });
}

export interface TeacherInput {
  name: string;
  email?: string;
  phone?: string;
  specialization?: string;
}

export interface CreateTeacherInput {
  name: string;
  email: string;
  phone: string;
  specialization?: string;
  groupIds?: string[];
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTeacherInput) =>
      (await api.post<CreateTeacherResultDto>("/teachers", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teachers"] }),
  });
}

export function useTeacherTempPassword(teacherId: string | null) {
  return useQuery({
    queryKey: ["teachers", teacherId, "temp-password"],
    queryFn: async () => (await api.get<TempPasswordDto>(`/teachers/${teacherId}/temp-password`)).data,
    enabled: Boolean(teacherId),
  });
}

export function useResetTeacherPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teacherId: string) => (await api.post<TempPasswordDto>(`/teachers/${teacherId}/reset-password`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teachers"] }),
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: TeacherInput & { id: string }) =>
      (await api.patch<TeacherDto>(`/teachers/${id}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teachers"] }),
  });
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/teachers/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teachers"] }),
  });
}

export function useActivateTeacherDashboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teacherId: string) =>
      (await api.post(`/teachers/${teacherId}/dashboard-access/activate`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teachers"] }),
  });
}

export function useSuspendTeacherDashboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teacherId: string) =>
      (await api.post(`/teachers/${teacherId}/dashboard-access/suspend`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teachers"] }),
  });
}
