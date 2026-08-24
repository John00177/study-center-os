import { useQuery } from "@tanstack/react-query";
import type { CalendarWeekDto } from "@crm/shared-types";
import { api } from "../lib/api";

export interface CalendarFilters {
  branchId?: string;
  teacherId?: string;
  classroomId?: string;
}

export function useCalendar(weekStart: string, filters: CalendarFilters) {
  return useQuery({
    queryKey: ["calendar", weekStart, filters.branchId, filters.teacherId, filters.classroomId],
    queryFn: async () =>
      (
        await api.get<CalendarWeekDto>("/schedules/calendar", {
          params: { weekStart, ...filters },
        })
      ).data,
  });
}

export async function checkScheduleConflict(params: {
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classroomId?: string;
  excludeId?: string;
}): Promise<boolean> {
  const { data } = await api.get<{ conflict: boolean }>("/schedules/conflicts", { params });
  return data.conflict;
}
