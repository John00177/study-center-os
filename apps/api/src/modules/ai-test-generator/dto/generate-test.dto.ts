import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

const LANGUAGES = ["uz", "en", "ru"];
export const QUESTION_TYPES = ["multiple_choice", "fill_blank", "true_false", "short_answer", "essay"];

export class GenerateTestDto {
  @IsString()
  topic!: string;

  @IsString()
  subject!: string;

  @IsString()
  level!: string;

  @IsInt()
  @Min(5)
  @Max(50)
  questionCount!: number;

  @IsOptional()
  @IsArray()
  @IsIn(QUESTION_TYPES, { each: true })
  types?: string[];

  @IsInt()
  @Min(1)
  duration!: number;

  @IsOptional()
  @IsIn(LANGUAGES)
  language?: string;
}
