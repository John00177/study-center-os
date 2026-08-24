import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

const TYPES = ["issue", "idea", "question", "other"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export class CreateTicketDto {
  @IsIn(TYPES)
  type!: (typeof TYPES)[number];

  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: (typeof PRIORITIES)[number];
}
