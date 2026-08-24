import { IsOptional, IsString } from "class-validator";

export class ApproveApplicationDto {
  @IsOptional()
  @IsString()
  planId?: string;
}
