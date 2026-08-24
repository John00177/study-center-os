import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ScheduleDto } from "@crm/shared-types";
import { api } from "../lib/api";

export function useSchedules() {
  return useQuery({
    queryKey: ["schedules"],
    queryFn: async () => (await api.get<ScheduleDto[]>("/schedules")).data,
  });
}

export interface ScheduleInput {
  groupId: string;
  branchId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classroomId?: string;
}

function invalidateScheduleQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["schedules"] });
  queryClient.invalidateQueries({ queryKey: ["calendar"] });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ScheduleInput) => (await api.post<ScheduleDto>("/schedules", input)).data,
    onSuccess: () => invalidateScheduleQueries(queryClient),
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ScheduleInput & { id: string }) =>
      (await api.patch<ScheduleDto>(`/schedules/${id}`, input)).data,
    onSuccess: () => invalidateScheduleQueries(queryClient),
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/schedules/${id}`)).data,
    onSuccess: () => invalidateScheduleQueries(queryClient),
  });
}
