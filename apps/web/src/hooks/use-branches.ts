import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BranchDto, BranchStatus } from "@crm/shared-types";
import { api } from "../lib/api";

export function useBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: async () => (await api.get<BranchDto[]>("/branches")).data,
  });
}

export interface BranchInput {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: BranchStatus;
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BranchInput) => (await api.post<BranchDto>("/branches", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] }),
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: BranchInput & { id: string }) =>
      (await api.patch<BranchDto>(`/branches/${id}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] }),
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/branches/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] }),
  });
}
