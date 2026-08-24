import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, Min } from "class-validator";
import type { GroupStatus } from "@prisma/client";

const GROUP_STATUSES: GroupStatus[] = ["active", "inactive", "completed"];
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export class CreateGroupDto {
  @IsString()
  name!: string;

  @IsString()
  branchId!: string;

  @IsString()
  courseId!: string;

  @IsOptional()
  @IsEnum(GROUP_STATUSES)
  status?: GroupStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStudents?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyFee?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scheduleDays?: string[];

  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN)
  endTime?: string;
}
