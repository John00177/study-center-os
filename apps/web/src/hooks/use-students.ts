import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateStudentDirectInput,
  CreateStudentResultDto,
  LinkParentInput,
  LinkParentResultDto,
  StageCountsDto,
  StudentDto,
  StudentStage,
  TempPasswordDto,
} from "@crm/shared-types";
import { api } from "../lib/api";

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async () => (await api.get<StudentDto[]>("/students")).data,
  });
}

export function useStageCounts() {
  return useQuery({
    queryKey: ["students", "stage-counts"],
    queryFn: async () => (await api.get<StageCountsDto>("/students/stage-counts")).data,
  });
}

export function useUpdateStudentStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: StudentStage }) =>
      (await api.patch<StudentDto>(`/students/${id}/stage`, { stage })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export interface StudentInput {
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string | null;
  address?: string;
  emergencyContact?: string;
  interestedCourse?: string;
  gender?: string;
  leadSource?: string;
  medicalCard?: boolean;
  parentPhone?: string;
  notes?: string;
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StudentInput) => (await api.post<StudentDto>("/students", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: StudentInput & { id: string }) =>
      (await api.patch<StudentDto>(`/students/${id}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/students/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
}

export function useCreateStudentDirect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStudentDirectInput) =>
      (await api.post<CreateStudentResultDto>("/students/direct", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
    },
  });
}

export function useLinkParent(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LinkParentInput) =>
      (await api.post<LinkParentResultDto>(`/students/${studentId}/parent`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
}

export function useStudentTempPassword(studentId: string | null) {
  return useQuery({
    queryKey: ["students", studentId, "temp-password"],
    queryFn: async () => (await api.get<TempPasswordDto>(`/students/${studentId}/temp-password`)).data,
    enabled: Boolean(studentId),
  });
}

export function useResetStudentPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => (await api.post<TempPasswordDto>(`/students/${studentId}/reset-password`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
}
