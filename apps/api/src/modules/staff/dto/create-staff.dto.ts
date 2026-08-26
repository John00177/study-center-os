import { IsIn, IsOptional, IsString } from "class-validator";

const STAFF_ROLES = ["reception", "teacher", "manager"] as const;

export class CreateStaffDto {
  @IsString()
  name!: string;

  @IsIn(STAFF_ROLES)
  role!: (typeof STAFF_ROLES)[number];

  @IsOptional()
  @IsString()
  phone?: string;
}
