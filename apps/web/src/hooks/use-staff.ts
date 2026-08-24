import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateReceptionistInput,
  CreateReceptionistResultDto,
  StaffMemberDto,
  TempPasswordDto,
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

export function useCreateReceptionist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateReceptionistInput) =>
      (await api.post<CreateReceptionistResultDto>("/staff/receptionists", input)).data,
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
