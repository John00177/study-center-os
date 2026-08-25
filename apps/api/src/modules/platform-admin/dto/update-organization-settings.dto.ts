import { IsBoolean, IsOptional } from "class-validator";

export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @IsBoolean()
  hasBranches?: boolean;
}
