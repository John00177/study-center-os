import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StudentTakeTestDto, StudentTestListItemDto, SubmitTestResultDto, TestOwnResultDto } from "@crm/shared-types";
import { api } from "../lib/api";

export function useAvailableTests() {
  return useQuery({
    queryKey: ["student", "tests"],
    queryFn: async () => (await api.get<StudentTestListItemDto[]>("/student/tests")).data,
  });
}

export function useTestForTaking(id: string | null) {
  return useQuery({
    queryKey: ["student", "tests", id],
    queryFn: async () => (await api.get<StudentTakeTestDto>(`/student/tests/${id}`)).data,
    enabled: Boolean(id),
    retry: false,
  });
}

export interface SubmitAnswerInput {
  questionId: string;
  answer: string;
}

export function useSubmitTest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (answers: SubmitAnswerInput[]) =>
      (await api.post<SubmitTestResultDto>(`/student/tests/${id}/submit`, { answers })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["student", "tests"] }),
  });
}

export function useOwnTestResult(id: string | null) {
  return useQuery({
    queryKey: ["student", "tests", id, "result"],
    queryFn: async () => (await api.get<TestOwnResultDto>(`/student/tests/${id}/result`)).data,
    enabled: Boolean(id),
  });
}
