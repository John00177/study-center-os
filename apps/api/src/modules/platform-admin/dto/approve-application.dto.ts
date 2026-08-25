import { IsBoolean, IsOptional, IsString } from "class-validator";

export class ApproveApplicationDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsBoolean()
  hasBranches?: boolean;
}
