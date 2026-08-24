import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import type { CourseCategory } from "@prisma/client";

const COURSE_CATEGORIES: CourseCategory[] = [
  "language",
  "mathematics",
  "science",
  "it_computer",
  "arts",
  "music",
  "sports",
  "preparation",
  "other",
];

export class CreateCourseDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEnum(COURSE_CATEGORIES)
  category?: CourseCategory;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyFee?: number;
}
