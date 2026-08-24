import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClassroomDto } from "@crm/shared-types";
import { api } from "../lib/api";

export function useClassrooms() {
  return useQuery({
    queryKey: ["classrooms"],
    queryFn: async () => (await api.get<ClassroomDto[]>("/classrooms")).data,
  });
}

export interface ClassroomInput {
  branchId: string;
  name: string;
  capacity?: number;
}

export function useCreateClassroom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClassroomInput) => (await api.post<ClassroomDto>("/classrooms", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classrooms"] }),
  });
}
