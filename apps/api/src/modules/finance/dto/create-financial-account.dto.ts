import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import type { AccountType } from "@prisma/client";

const ACCOUNT_TYPES: AccountType[] = ["cash_desk", "bank_account", "card_terminal", "other"];

export class CreateFinancialAccountDto {
  @IsString()
  name!: string;

  @IsEnum(ACCOUNT_TYPES)
  type!: AccountType;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
