import { IsDateString, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateChargeDto {
  @IsString()
  branchId!: string;

  @IsString()
  studentId!: string;

  @IsInt()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  dueDate!: string;
}
