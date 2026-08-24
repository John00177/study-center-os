import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GroupDto, GroupStatus, StudentDto } from "@crm/shared-types";
import { api } from "../lib/api";

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: async () => (await api.get<GroupDto[]>("/groups")).data,
  });
}

export interface GroupMembershipDto {
  id: string;
  groupId: string;
  studentId: string;
  enrolledAt: string;
  status: string;
  student: StudentDto | null;
}

export function useGroupMemberships(groupId: string) {
  return useQuery({
    queryKey: ["groups", groupId, "memberships"],
    queryFn: async () => (await api.get<GroupMembershipDto[]>(`/groups/${groupId}/memberships`)).data,
    enabled: Boolean(groupId),
  });
}

export interface GroupInput {
  name: string;
  branchId: string;
  courseId: string;
  status?: GroupStatus;
  maxStudents?: number;
  startDate?: string;
  endDate?: string;
  monthlyFee?: number;
  scheduleDays?: string[];
  startTime?: string;
  endTime?: string;
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: GroupInput) => (await api.post<GroupDto>("/groups", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: GroupInput & { id: string }) =>
      (await api.patch<GroupDto>(`/groups/${id}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/groups/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups"] }),
  });
}
