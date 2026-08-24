import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateClassroomDto {
  @IsString()
  branchId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
