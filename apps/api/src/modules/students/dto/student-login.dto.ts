import { IsString } from "class-validator";

export class StudentLoginDto {
  /** Phone or email — whichever the student has on file. */
  @IsString()
  identifier!: string;

  @IsString()
  password!: string;
}
