import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActiveStudentDto, StudentDto } from "@crm/shared-types";
import { api } from "../lib/api";

function invalidateAllStudentQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["students"] });
  queryClient.invalidateQueries({ queryKey: ["newcomers"] });
  queryClient.invalidateQueries({ queryKey: ["active-students"] });
  queryClient.invalidateQueries({ queryKey: ["archived-students"] });
}

export function useNewcomers() {
  return useQuery({
    queryKey: ["newcomers"],
    queryFn: async () => (await api.get<StudentDto[]>("/students/newcomers")).data,
  });
}

export function useArchivedStudents() {
  return useQuery({
    queryKey: ["archived-students"],
    queryFn: async () => (await api.get<StudentDto[]>("/students/archived")).data,
  });
}

export function useActiveStudents() {
  return useQuery({
    queryKey: ["active-students"],
    queryFn: async () => (await api.get<ActiveStudentDto[]>("/students/active")).data,
  });
}

export function useConvertStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, groupId }: { id: string; groupId: string }) =>
      (await api.post(`/students/${id}/convert`, { groupId })).data,
    onSuccess: () => invalidateAllStudentQueries(queryClient),
  });
}

export function useArchiveStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/students/${id}/archive`)).data,
    onSuccess: () => invalidateAllStudentQueries(queryClient),
  });
}

export function useAddStudentNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) =>
      (await api.patch<StudentDto>(`/students/${id}/notes`, { note })).data,
    onSuccess: () => invalidateAllStudentQueries(queryClient),
  });
}
