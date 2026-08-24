import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { QUESTION_TYPES } from "./generate-test.dto";

export class QuestionInputDto {
  @IsIn(QUESTION_TYPES)
  type!: string;

  @IsString()
  text!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsInt()
  @Min(1)
  marks!: number;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsInt()
  @Min(0)
  order!: number;
}
