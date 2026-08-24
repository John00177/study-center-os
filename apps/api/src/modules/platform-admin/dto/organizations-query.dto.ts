import { IsIn, IsOptional, IsString } from "class-validator";

const ORG_STATUSES = ["active", "suspended", "trial"] as const;

export class OrganizationsQueryDto {
  @IsOptional()
  @IsIn(ORG_STATUSES)
  status?: (typeof ORG_STATUSES)[number];

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  plan?: string;
}
