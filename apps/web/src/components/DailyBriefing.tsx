import { useDailyBriefing, type DailyBriefingRole } from "../hooks/use-daily-briefing";
import { DailyBriefingModal, type BriefingData } from "./DailyBriefingModal";

interface DailyBriefingProps<R extends DailyBriefingRole> {
  role: R;
  dashboardHref: string;
  enabled?: boolean;
}

// Thin per-layout wrapper: role and data are always constructed together by
// useDailyBriefing<R>, so the assertion below just restates a pairing the
// type system can't infer through the generic without a full switch.
export function DailyBriefing<R extends DailyBriefingRole>({ role, dashboardHref, enabled = true }: DailyBriefingProps<R>) {
  const { data, isOpen, dismiss } = useDailyBriefing(role, enabled);

  if (!isOpen || !data) return null;

  return <DailyBriefingModal briefing={{ role, data } as BriefingData} onDismiss={dismiss} dashboardHref={dashboardHref} />;
}
