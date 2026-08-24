import { IsOptional, IsString } from "class-validator";

export class SuspendOrganizationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
