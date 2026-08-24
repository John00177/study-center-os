import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ParentDto } from "@crm/shared-types";
import { api } from "../lib/api";

export function useParents() {
  return useQuery({
    queryKey: ["parents"],
    queryFn: async () => (await api.get<ParentDto[]>("/parents")).data,
  });
}

export interface ParentInput {
  name: string;
  email?: string;
  phone?: string;
}

export function useCreateParent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ParentInput) => (await api.post<ParentDto>("/parents", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parents"] }),
  });
}

export function useUpdateParent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ParentInput & { id: string }) =>
      (await api.patch<ParentDto>(`/parents/${id}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parents"] }),
  });
}

export function useDeleteParent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/parents/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parents"] }),
  });
}
