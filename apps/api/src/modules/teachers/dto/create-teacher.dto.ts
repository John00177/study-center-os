import { IsArray, IsEmail, IsOptional, IsString } from "class-validator";

export class CreateTeacherDto {
  @IsString()
  name!: string;

  // Auto-generated server-side (firstname.lastname@{org}.uz) when omitted —
  // see generateStaffEmail, used by the unified staff-creation flow.
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[];
}
