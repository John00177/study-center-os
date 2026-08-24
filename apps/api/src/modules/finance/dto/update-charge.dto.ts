import { PartialType } from "@nestjs/mapped-types";
import { IsEnum, IsOptional } from "class-validator";
import type { ChargeStatus } from "@prisma/client";
import { CreateChargeDto } from "./create-charge.dto";

const CHARGE_STATUSES: ChargeStatus[] = ["pending", "paid", "overdue", "cancelled"];

export class UpdateChargeDto extends PartialType(CreateChargeDto) {
  @IsOptional()
  @IsEnum(CHARGE_STATUSES)
  status?: ChargeStatus;
}
