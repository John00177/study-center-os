import { IsDateString, IsOptional, IsString } from "class-validator";

export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class AttendanceAnalyticsQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  groupId?: string;
}
