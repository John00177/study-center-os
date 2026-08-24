import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface RegisterPushTokenInput {
  token: string;
  platform: "ios" | "android" | "web";
}

export function useRegisterPushToken() {
  return useMutation({
    mutationFn: async (input: RegisterPushTokenInput) => (await api.post("/users/push-token", input)).data,
  });
}
