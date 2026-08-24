import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type {
  OwnerBriefingDto,
  ParentBriefingDto,
  PlatformAdminBriefingDto,
  ReceptionBriefingDto,
  StudentBriefingDto,
  TeacherBriefingDto,
} from "@crm/shared-types";
import { api } from "../lib/api";

export type DailyBriefingRole = "owner" | "reception" | "teacher" | "student" | "parent" | "platform_admin";

type BriefingByRole = {
  owner: OwnerBriefingDto;
  reception: ReceptionBriefingDto;
  teacher: TeacherBriefingDto;
  student: StudentBriefingDto;
  parent: ParentBriefingDto;
  platform_admin: PlatformAdminBriefingDto;
};

const ENDPOINT_BY_ROLE: Record<DailyBriefingRole, string> = {
  owner: "/daily-briefing",
  reception: "/daily-briefing",
  teacher: "/teacher/daily-briefing",
  student: "/student/daily-briefing",
  parent: "/parent/daily-briefing",
  platform_admin: "/admin/daily-briefing",
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function dismissedStorageKey(role: DailyBriefingRole): string {
  return `dailyBriefingDismissed_${role}_${todayKey()}`;
}

export function useDailyBriefing<R extends DailyBriefingRole>(role: R, enabled = true) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(dismissedStorageKey(role)) === "true");

  const query = useQuery({
    queryKey: ["daily-briefing", role],
    queryFn: async () => (await api.get<BriefingByRole[R]>(ENDPOINT_BY_ROLE[role])).data,
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // A stale flag from yesterday shouldn't suppress today's briefing.
  useEffect(() => {
    setDismissed(localStorage.getItem(dismissedStorageKey(role)) === "true");
  }, [role]);

  function dismiss(dontShowAgainToday: boolean) {
    setDismissed(true);
    if (dontShowAgainToday) {
      localStorage.setItem(dismissedStorageKey(role), "true");
    }
  }

  return {
    data: query.data,
    isLoading: query.isLoading,
    isOpen: enabled && !dismissed && !query.isLoading && !query.isError && !!query.data,
    dismiss,
  };
}
