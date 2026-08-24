import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  GeneratedTestDto,
  QuestionType,
  TestDto,
  TestLanguage,
  TestResultsDto,
  TestStatus,
  TestSubmissionDetailDto,
  TestSummaryDto,
} from "@crm/shared-types";
import { api } from "../lib/api";

export interface GenerateTestInput {
  topic: string;
  subject: string;
  level: string;
  questionCount: number;
  types?: QuestionType[];
  duration: number;
  language?: TestLanguage;
}

export function useGenerateTest() {
  return useMutation({
    mutationFn: async (input: GenerateTestInput) => (await api.post<GeneratedTestDto>("/ai-tests/generate", input)).data,
  });
}

export interface QuestionInput {
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer?: string;
  marks: number;
  explanation?: string;
  order: number;
}

export interface SaveTestInput {
  title: string;
  topic: string;
  subject: string;
  level: string;
  duration: number;
  totalMarks: number;
  passMarks: number;
  questions: QuestionInput[];
  groupId?: string;
  status?: TestStatus;
}

export function useSaveTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveTestInput) => (await api.post<TestDto>("/ai-tests", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-tests"] }),
  });
}

export interface TestFilters {
  status?: TestStatus | "";
  subject?: string;
  search?: string;
}

export function useTests(filters: TestFilters = {}) {
  return useQuery({
    queryKey: ["ai-tests", filters],
    queryFn: async () =>
      (
        await api.get<TestDto[]>("/ai-tests", {
          params: { status: filters.status || undefined, subject: filters.subject || undefined, search: filters.search || undefined },
        })
      ).data,
  });
}

export function useTest(id: string | null) {
  return useQuery({
    queryKey: ["ai-tests", id],
    queryFn: async () => (await api.get<TestDto>(`/ai-tests/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useTestSummary() {
  return useQuery({
    queryKey: ["ai-tests", "summary"],
    queryFn: async () => (await api.get<TestSummaryDto>("/ai-tests/summary")).data,
  });
}

export interface UpdateTestInput extends Partial<SaveTestInput> {
  id: string;
}

export function useUpdateTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTestInput) => (await api.patch<TestDto>(`/ai-tests/${id}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-tests"] }),
  });
}

export function useDeleteTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/ai-tests/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-tests"] }),
  });
}

export function usePublishTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, groupId }: { id: string; groupId: string }) =>
      (await api.post<TestDto>(`/ai-tests/${id}/publish`, { groupId })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-tests"] }),
  });
}

export function useCloseTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<TestDto>(`/ai-tests/${id}/close`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-tests"] }),
  });
}

export function useTestResults(id: string | null) {
  return useQuery({
    queryKey: ["ai-tests", id, "results"],
    queryFn: async () => (await api.get<TestResultsDto>(`/ai-tests/${id}/results`)).data,
    enabled: Boolean(id),
  });
}

export function useSubmissionDetail(testId: string | null, submissionId: string | null) {
  return useQuery({
    queryKey: ["ai-tests", testId, "submissions", submissionId],
    queryFn: async () => (await api.get<TestSubmissionDetailDto>(`/ai-tests/${testId}/submissions/${submissionId}`)).data,
    enabled: Boolean(testId && submissionId),
  });
}

export function useGradeEssay(testId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      submissionId,
      questionId,
      marksObtained,
      feedback,
    }: {
      submissionId: string;
      questionId: string;
      marksObtained: number;
      feedback?: string;
    }) =>
      (
        await api.post(`/ai-tests/${testId}/submissions/${submissionId}/grade`, {
          questionId,
          marksObtained,
          feedback,
        })
      ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-tests", testId, "results"] }),
  });
}
