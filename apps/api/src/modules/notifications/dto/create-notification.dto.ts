import { IsIn, IsOptional, IsString } from "class-validator";

const NOTIFICATION_TYPES = ["info", "success", "warning", "error"] as const;

export class CreateNotificationDto {
  @IsString()
  userId!: string;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsIn(NOTIFICATION_TYPES)
  type?: (typeof NOTIFICATION_TYPES)[number];

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsIn(["user", "student"])
  recipientType?: "user" | "student";

  @IsOptional()
  @IsString()
  senderId?: string;

  @IsOptional()
  @IsString()
  senderName?: string;
}
