import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateHomeworkDto {
  @IsString()
  groupId!: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  dueDate!: string;
}
