import { IsEmail, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class SignupDto {
  @IsString()
  @MinLength(2)
  organizationName!: string;

  @Matches(/^[a-z0-9-]+$/, { message: "Slug must contain only lowercase letters, numbers, and hyphens" })
  @MinLength(3)
  slug!: string;

  @IsString()
  @MinLength(2)
  ownerName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(5)
  ownerPhone!: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  password!: string;

  @IsString()
  @MinLength(2)
  country!: string;

  @IsString()
  @MinLength(2)
  city!: string;

  @IsOptional()
  @IsString()
  address?: string;
}
