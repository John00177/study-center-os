import { IsOptional, IsString } from "class-validator";

export class ConvertToActiveDto {
  @IsString()
  groupId!: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  parentPhone?: string;
}
