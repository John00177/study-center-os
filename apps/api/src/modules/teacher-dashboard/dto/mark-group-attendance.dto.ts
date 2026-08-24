import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, ValidateNested } from "class-validator";
import { AttendanceRecordDto } from "../../attendance/dto/bulk-mark-attendance.dto";

export class MarkGroupAttendanceDto {
  @IsDateString()
  date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records!: AttendanceRecordDto[];
}
