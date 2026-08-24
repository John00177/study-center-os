import { IsEmail, IsString } from "class-validator";

export class LinkParentDto {
  @IsString()
  parentName!: string;

  @IsEmail()
  parentEmail!: string;

  @IsString()
  parentPhone!: string;
}
