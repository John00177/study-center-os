import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CourseCategory, CourseDto } from "@crm/shared-types";
import { api } from "../lib/api";

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => (await api.get<CourseDto[]>("/courses")).data,
  });
}

export function useCourse(id: string | null) {
  return useQuery({
    queryKey: ["courses", id],
    queryFn: async () => (await api.get<CourseDto>(`/courses/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useCoursesByCategory(category: CourseCategory | "") {
  return useQuery({
    queryKey: ["courses", "by-category", category],
    queryFn: async () => (await api.get<CourseDto[]>("/courses/by-category", { params: { category } })).data,
    enabled: Boolean(category),
  });
}

export interface CourseInput {
  name: string;
  category?: CourseCategory;
  description?: string;
  duration?: string;
  level?: string;
  monthlyFee?: number;
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CourseInput) => (await api.post<CourseDto>("/courses", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: CourseInput & { id: string }) =>
      (await api.patch<CourseDto>(`/courses/${id}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/courses/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
  });
}
