import { IsInt, IsOptional, IsString, Min } from "class-validator";

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

  @IsString()
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  /** When set, this payment settles that charge — the charge is marked "paid" in the same transaction. */
  @IsOptional()
  @IsString()
  chargeId?: string;
}
