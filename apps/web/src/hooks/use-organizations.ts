import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrganizationBrandingDto, OrganizationFullBrandingDto } from "@crm/shared-types";
import { api } from "../lib/api";

export function usePublicBranding(slug: string | null) {
  return useQuery({
    queryKey: ["organizations", "branding", slug],
    queryFn: async () => (await api.get<OrganizationBrandingDto>("/organizations/branding", { params: { slug } })).data,
    enabled: Boolean(slug),
    staleTime: 60_000,
    retry: false,
  });
}

export function useMyBranding(enabled = true) {
  return useQuery({
    queryKey: ["organizations", "me", "branding"],
    queryFn: async () => (await api.get<OrganizationFullBrandingDto>("/organizations/me/branding")).data,
    enabled,
    retry: false,
  });
}

export interface UpdateBrandingInput {
  logoUrl?: string | null;
  primaryColor?: string;
  accentColor?: string;
  theme?: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
}

export function useUpdateBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateBrandingInput) =>
      (await api.patch<OrganizationFullBrandingDto>("/organizations/me/branding", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organizations"] }),
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("logo", file);
      return (
        await api.post<OrganizationFullBrandingDto>("/organizations/me/logo", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organizations"] }),
  });
}
