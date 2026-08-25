import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const NOTIFICATION_TYPES = ["info", "success", "warning", "error"] as const;

export class SendNotificationDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(2000)
  message!: string;

  /**
   * User ids for staff recipients, or Student ids when a teacher messages
   * students. Always re-validated server-side against the sender's allowed
   * recipient list — see NotificationsService.sendToRecipients.
   */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  recipientIds!: string[];

  @IsOptional()
  @IsIn(NOTIFICATION_TYPES)
  type?: (typeof NOTIFICATION_TYPES)[number];
}
