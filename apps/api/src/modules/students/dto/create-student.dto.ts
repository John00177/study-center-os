import { IsBoolean, IsDateString, IsIn, IsOptional, IsString } from "class-validator";

const GENDERS = ["male", "female"] as const;

export class CreateStudentDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  socialAccount?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  interestedCourse?: string;

  @IsIn(GENDERS)
  gender!: (typeof GENDERS)[number];

  @IsOptional()
  @IsBoolean()
  medicalCard?: boolean;

  @IsOptional()
  @IsString()
  parentPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
