import { IsIn, IsString } from "class-validator";

const PUSH_PLATFORMS = ["ios", "android", "web"] as const;

export class RegisterPushTokenDto {
  @IsString()
  token!: string;

  @IsIn(PUSH_PLATFORMS)
  platform!: (typeof PUSH_PLATFORMS)[number];
}
