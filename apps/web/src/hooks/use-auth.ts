import { useMutation, useQuery } from "@tanstack/react-query";
import type { SignupRequestDto, SignupResponseDto } from "@crm/shared-types";
import { api } from "../lib/api";

export function useSignup() {
  return useMutation({
    mutationFn: async (input: SignupRequestDto) =>
      (await api.post<SignupResponseDto>("/auth/signup", input)).data,
  });
}

export function useCheckSlug(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: ["auth", "check-slug", slug],
    queryFn: async () => (await api.get<{ available: boolean }>("/auth/check-slug", { params: { slug } })).data,
    enabled,
    retry: false,
    staleTime: 0,
  });
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

function useChangePasswordMutation(endpoint: string) {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) => (await api.post(endpoint, input)).data,
  });
}

export function useChangePassword() {
  return useChangePasswordMutation("/auth/change-password");
}

export function useStudentChangePassword() {
  return useChangePasswordMutation("/auth/student-change-password");
}

export function useParentChangePassword() {
  return useChangePasswordMutation("/auth/parent-change-password");
}
