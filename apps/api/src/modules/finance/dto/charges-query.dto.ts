import { IsIn, IsOptional, IsString } from "class-validator";
import type { ChargeStatus } from "@prisma/client";

const CHARGE_STATUSES: ChargeStatus[] = ["pending", "paid", "overdue", "cancelled"];
const SORT_OPTIONS = ["urgency", "dueDate", "amount", "name"] as const;
export type ChargesSortBy = (typeof SORT_OPTIONS)[number];

export class ChargesQueryDto {
  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sortBy?: ChargesSortBy;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsIn(CHARGE_STATUSES)
  status?: ChargeStatus;

  @IsOptional()
  @IsString()
  groupId?: string;
}
