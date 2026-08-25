import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export class UpdateTicketDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: (typeof PRIORITIES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  internalNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  adminReply?: string;
}
