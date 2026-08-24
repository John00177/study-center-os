import { IsEnum, IsOptional, IsString } from "class-validator";
import type { HomeworkStatus } from "@prisma/client";

const HOMEWORK_STATUSES: HomeworkStatus[] = ["active", "completed", "cancelled"];

export class HomeworkQueryDto {
  @IsString()
  groupId!: string;

  @IsOptional()
  @IsEnum(HOMEWORK_STATUSES)
  status?: HomeworkStatus;
}
