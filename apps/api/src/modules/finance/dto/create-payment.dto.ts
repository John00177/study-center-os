import { IsIn, IsInt, IsOptional, IsDateString, IsString, Min } from "class-validator";

// Text labels only — no real payment gateway/API integration behind any of these.
export const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "card",
  "click",
  "payme",
  "humo_terminal",
  "uzum_bank",
] as const;

export class CreatePaymentDto {
  @IsString()
  branchId!: string;

  @IsString()
  studentId!: string;

  @IsString()
  financialAccountId!: string;

  @IsInt()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsIn(PAYMENT_METHODS)
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  /** When set, this payment settles that charge — the charge is marked "paid" in the same transaction. */
  @IsOptional()
  @IsString()
  chargeId?: string;

  @IsOptional()
  @IsDateString()
  periodStartDate?: string;

  @IsOptional()
  @IsDateString()
  periodEndDate?: string;
}
