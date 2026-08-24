import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AttendanceDto,
  AttendanceStatus,
  LessonDto,
  TeacherGroupDto,
  TeacherGroupStudentDto,
  TeacherStudentRowDto,
} from "@crm/shared-types";
import { api } from "../lib/api";

export function useMyGroups() {
  return useQuery({
    queryKey: ["teacher", "groups"],
    queryFn: async () => (await api.get<TeacherGroupDto[]>("/teacher/groups")).data,
  });
}

export function useAllTeacherStudents(enabled = true) {
  return useQuery({
    queryKey: ["teacher", "students"],
    queryFn: async () => (await api.get<TeacherStudentRowDto[]>("/teacher/students")).data,
    enabled,
  });
}

export function useGroupStudents(groupId: string) {
  return useQuery({
    queryKey: ["teacher", "groups", groupId, "students"],
    queryFn: async () =>
      (await api.get<TeacherGroupStudentDto[]>(`/teacher/groups/${groupId}/students`)).data,
    enabled: Boolean(groupId),
  });
}

export function useGroupAttendance(groupId: string, date: string) {
  return useQuery({
    queryKey: ["teacher", "groups", groupId, "attendance", date],
    queryFn: async () =>
      (await api.get<AttendanceDto[]>(`/teacher/groups/${groupId}/attendance`, { params: { date } })).data,
    enabled: Boolean(groupId && date),
  });
}

export interface MarkGroupAttendanceInput {
  date: string;
  records: { studentId: string; status: AttendanceStatus; notes?: string }[];
}

export function useMarkGroupAttendance(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MarkGroupAttendanceInput) =>
      (await api.post<AttendanceDto[]>(`/teacher/groups/${groupId}/attendance`, input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher", "groups", groupId, "attendance"] });
      queryClient.invalidateQueries({ queryKey: ["teacher", "groups", groupId, "students"] });
    },
  });
}

export function useLessonNotes(groupId: string) {
  return useQuery({
    queryKey: ["teacher", "groups", groupId, "lessons"],
    queryFn: async () => (await api.get<LessonDto[]>(`/teacher/groups/${groupId}/lessons`)).data,
    enabled: Boolean(groupId),
  });
}

export interface LessonNoteInput {
  title: string;
  description?: string;
  date: string;
}

export function useCreateLessonNote(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LessonNoteInput) =>
      (await api.post<LessonDto>(`/teacher/groups/${groupId}/lessons`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher", "groups", groupId, "lessons"] }),
  });
}
