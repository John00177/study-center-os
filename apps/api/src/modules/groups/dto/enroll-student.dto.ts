import { IsDateString, IsOptional, IsString } from "class-validator";

export class EnrollStudentDto {
  @IsString()
  studentId!: string;

  @IsOptional()
  @IsDateString()
  enrolledAt?: string;
}
