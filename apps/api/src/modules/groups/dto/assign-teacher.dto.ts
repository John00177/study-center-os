import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import type { AssignmentRole } from "@prisma/client";

const ASSIGNMENT_ROLES: AssignmentRole[] = ["primary", "assistant", "substitute"];

export class AssignTeacherDto {
  @IsString()
  teacherId!: string;

  @IsOptional()
  @IsEnum(ASSIGNMENT_ROLES)
  assignmentRole?: AssignmentRole;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}
