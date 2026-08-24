import { IsDateString, IsOptional } from "class-validator";

export class PlatformRevenueQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
