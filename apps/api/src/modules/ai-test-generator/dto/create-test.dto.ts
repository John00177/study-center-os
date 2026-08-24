import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { QuestionInputDto } from "./question-input.dto";

const STATUSES = ["draft", "published", "closed"];

export class CreateTestDto {
  @IsString()
  title!: string;

  @IsString()
  topic!: string;

  @IsString()
  subject!: string;

  @IsString()
  level!: string;

  @IsInt()
  @Min(1)
  duration!: number;

  @IsInt()
  @Min(1)
  totalMarks!: number;

  @IsInt()
  @Min(0)
  passMarks!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionInputDto)
  questions!: QuestionInputDto[];

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: string;
}
