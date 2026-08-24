import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import type { GroupStatus } from "@prisma/client";

const GROUP_STATUSES: GroupStatus[] = ["active", "inactive", "completed"];

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
}
