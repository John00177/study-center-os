import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateScheduleDto {
  @IsString()
  groupId!: string;

  @IsString()
  branchId!: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsString()
  classroomId?: string;
}
