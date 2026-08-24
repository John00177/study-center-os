import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import type { BranchStatus } from "@prisma/client";

const BRANCH_STATUSES: BranchStatus[] = ["active", "inactive"];

export class CreateBranchDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(BRANCH_STATUSES)
  status?: BranchStatus;
}
