import { IsEmail, IsString } from "class-validator";

export class CreateReceptionistDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;
}
