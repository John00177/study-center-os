import { IsString } from "class-validator";

export class PublishTestDto {
  @IsString()
  groupId!: string;
}
