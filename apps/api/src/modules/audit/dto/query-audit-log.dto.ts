import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

// Real audit actions are free-form "entityType.verb" strings (e.g.
// "student.created", "branch.updated") rather than a fixed enum, so we
// filter by verb suffix ("created"/"updated"/"deleted") instead of exact
// match — see AuditService.record()'s call sites across every module.
const VERBS = ["created", "updated", "deleted"] as const;

export class QueryAuditLogDto {
  @IsOptional()
  @IsIn(VERBS)
  verb?: (typeof VERBS)[number];

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
