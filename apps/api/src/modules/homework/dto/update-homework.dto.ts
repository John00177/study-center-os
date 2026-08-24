import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import type { HomeworkStatus } from "@prisma/client";

const HOMEWORK_STATUSES: HomeworkStatus[] = ["active", "completed", "cancelled"];

export class UpdateHomeworkDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(HOMEWORK_STATUSES)
  status?: HomeworkStatus;
}
