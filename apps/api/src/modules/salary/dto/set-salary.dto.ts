import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

const SALARY_TYPES = ["fixed", "hourly", "per_student"] as const;

export class SetSalaryDto {
  @IsString()
  teacherId!: string;

  @IsIn(SALARY_TYPES)
  type!: (typeof SALARY_TYPES)[number];

  /** Monthly amount for fixed salaries; base estimate for hourly/per_student. */
  @IsInt()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  perStudentRate?: number;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
