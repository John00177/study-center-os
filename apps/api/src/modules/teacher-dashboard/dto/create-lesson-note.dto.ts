import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateLessonNoteDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date!: string;
}
