import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateStudentDirectInput,
  CreateStudentResultDto,
  LinkParentInput,
  LinkParentResultDto,
  StageCountsDto,
  StudentDetailDto,
  StudentDto,
  TempPasswordDto,
} from "@crm/shared-types";
import { api } from "../lib/api";

// The Newcomers page reads from ["newcomers"] (see use-newcomers.ts), a
// separate query key from ["students"] — a create/update/delete here can
// change which of those lists a student belongs in, so both (plus the
// active/archived lists) need invalidating or the affected list silently
// goes stale until a manual reload. This was the "student registration
// looks broken" bug: creating a newcomer succeeded, but the Newcomers table
// never refreshed to show it.
function invalidateAllStudentQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["students"] });
  queryClient.invalidateQueries({ queryKey: ["newcomers"] });
  queryClient.invalidateQueries({ queryKey: ["active-students"] });
  queryClient.invalidateQueries({ queryKey: ["archived-students"] });
}

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async () => (await api.get<StudentDto[]>("/students")).data,
  });
}

export function useStudentDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["students", id, "detail"],
    queryFn: async () => (await api.get<StudentDetailDto>(`/students/${id}/detail`)).data,
    enabled: Boolean(id),
  });
}

export function useStageCounts() {
  return useQuery({
    queryKey: ["students", "stage-counts"],
    queryFn: async () => (await api.get<StageCountsDto>("/students/stage-counts")).data,
  });
}

export interface StudentInput {
  name: string;
  socialAccount?: string;
  phone?: string;
  // Required by the newcomer/student forms (validated client-side there),
  // but kept optional here since useUpdateStudent also powers partial saves
  // (e.g. StudentProfilePage's Notes tab, which sends only name + notes).
  dateOfBirth?: string | null;
  address?: string;
  emergencyContact?: string;
  interestedCourse?: string;
  gender?: string;
  medicalCard?: boolean;
  parentPhone?: string;
  notes?: string;
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StudentInput) => (await api.post<StudentDto>("/students", input)).data,
    onSuccess: () => invalidateAllStudentQueries(queryClient),
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: StudentInput & { id: string }) =>
      (await api.patch<StudentDto>(`/students/${id}`, input)).data,
    onSuccess: () => invalidateAllStudentQueries(queryClient),
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/students/${id}`)).data,
    onSuccess: () => invalidateAllStudentQueries(queryClient),
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
