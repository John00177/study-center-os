import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Min } from "class-validator";

const PAYMENT_METHODS = ["cash", "bank_transfer", "card"] as const;

export class RecordSalaryPaymentDto {
  /** "YYYY-MM" */
  @Matches(/^\d{4}-\d{2}$/)
  month!: string;

  @IsInt()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  paymentMethod?: (typeof PAYMENT_METHODS)[number];

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
