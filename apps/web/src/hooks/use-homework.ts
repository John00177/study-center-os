import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  HomeworkDetailDto,
  HomeworkDto,
  HomeworkStatus,
  StudentHomeworkDto,
} from "@crm/shared-types";
import { api } from "../lib/api";

export function useGroupHomework(groupId: string, status?: HomeworkStatus) {
  return useQuery({
    queryKey: ["homework", "group", groupId, status ?? null],
    queryFn: async () =>
      (await api.get<HomeworkDto[]>("/homework", { params: { groupId, status } })).data,
    enabled: Boolean(groupId),
  });
}

export function useHomeworkDetail(id: string | null) {
  return useQuery({
    queryKey: ["homework", "detail", id],
    queryFn: async () => (await api.get<HomeworkDetailDto>(`/homework/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useStudentHomework(studentId: string | null) {
  return useQuery({
    queryKey: ["homework", "student", studentId],
    queryFn: async () => (await api.get<StudentHomeworkDto[]>(`/homework/student/${studentId}`)).data,
    enabled: Boolean(studentId),
  });
}

export interface CreateHomeworkInput {
  groupId: string;
  lessonId?: string;
  title: string;
  description?: string;
  dueDate: string;
}

export function useCreateHomework() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateHomeworkInput) => (await api.post<HomeworkDto>("/homework", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["homework"] }),
  });
}

export interface GradeSubmissionInput {
  submissionId: string;
  score: number;
  feedback?: string;
}

export function useGradeSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, ...input }: GradeSubmissionInput) =>
      (await api.patch(`/homework/submissions/${submissionId}/grade`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["homework"] }),
  });
}
