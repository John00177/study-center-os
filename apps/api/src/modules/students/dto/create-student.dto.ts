import { IsBoolean, IsDateString, IsEmail, IsIn, IsOptional, IsString } from "class-validator";

const GENDERS = ["male", "female"] as const;
const LEAD_SOURCES = ["Google", "Instagram", "Referral", "Walk-in", "Other"] as const;

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
  @IsIn(GENDERS)
  gender?: (typeof GENDERS)[number];

  @IsOptional()
  @IsIn(LEAD_SOURCES)
  leadSource?: (typeof LEAD_SOURCES)[number];

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
