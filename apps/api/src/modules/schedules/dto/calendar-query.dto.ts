import { IsDateString, IsOptional, IsString } from "class-validator";

export class CalendarQueryDto {
  @IsDateString()
  weekStart!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  classroomId?: string;
}
