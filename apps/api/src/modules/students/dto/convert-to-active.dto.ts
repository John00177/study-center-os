import { IsString } from "class-validator";

export class ConvertToActiveDto {
  @IsString()
  groupId!: string;
}
