import { IsDateString, IsEmail, IsOptional, IsString } from "class-validator";

export class CreateStudentDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  interestedCourse?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
