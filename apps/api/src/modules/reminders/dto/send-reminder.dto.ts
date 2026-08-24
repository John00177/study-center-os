import { IsEnum, IsString } from "class-validator";
import type { ReminderType } from "@prisma/client";

const REMINDER_TYPES: ReminderType[] = ["sms", "whatsapp", "email", "push"];

export class SendReminderDto {
  @IsString()
  chargeId!: string;

  @IsEnum(REMINDER_TYPES)
  type!: ReminderType;
}
