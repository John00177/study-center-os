import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AttendanceDto, AttendanceStatus } from "@crm/shared-types";
import { api } from "../lib/api";

export function useAttendanceForGroupDate(groupId: string, date: string) {
  return useQuery({
    queryKey: ["attendance", "group", groupId, date],
    queryFn: async () =>
      (await api.get<AttendanceDto[]>("/attendance", { params: { groupId, date } })).data,
    enabled: Boolean(groupId && date),
  });
}

export function useStudentAttendanceHistory(studentId: string | null) {
  return useQuery({
    queryKey: ["attendance", "student", studentId],
    queryFn: async () => (await api.get<AttendanceDto[]>(`/attendance/student/${studentId}`)).data,
    enabled: Boolean(studentId),
  });
}

export interface AttendanceRecordInput {
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface BulkMarkAttendanceInput {
  groupId: string;
  date: string;
  records: AttendanceRecordInput[];
}

export function useBulkMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BulkMarkAttendanceInput) =>
      (await api.post<AttendanceDto[]>("/attendance/bulk", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });
}
