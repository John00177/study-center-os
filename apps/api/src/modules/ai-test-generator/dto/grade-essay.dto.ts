import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class GradeEssayDto {
  @IsString()
  questionId!: string;

  @IsInt()
  @Min(0)
  marksObtained!: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
