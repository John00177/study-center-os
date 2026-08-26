import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateStaffInput,
  CreateStaffResultDto,
  StaffMemberDto,
  TempPasswordDto,
  UpdateStaffInput,
} from "@crm/shared-types";
import { api } from "../lib/api";

export function useStaffList() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: async () => (await api.get<StaffMemberDto[]>("/staff")).data,
  });
}

export function useSuspendStaffMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => (await api.post(`/staff/${userId}/suspend`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useActivateStaffMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => (await api.post(`/staff/${userId}/activate`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useCreateStaffMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStaffInput) => (await api.post<CreateStaffResultDto>("/staff", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useUpdateStaffMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, ...input }: UpdateStaffInput & { userId: string }) =>
      (await api.patch(`/staff/${userId}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useDeleteStaffMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => (await api.delete(`/staff/${userId}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useStaffTempPassword(userId: string | null) {
  return useQuery({
    queryKey: ["staff", userId, "temp-password"],
    queryFn: async () => (await api.get<TempPasswordDto>(`/staff/${userId}/temp-password`)).data,
    enabled: Boolean(userId),
  });
}

export function useResetStaffPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => (await api.post<TempPasswordDto>(`/staff/${userId}/reset-password`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}
