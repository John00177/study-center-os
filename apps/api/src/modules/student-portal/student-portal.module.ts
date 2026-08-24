import { Module } from "@nestjs/common";
import { AttendanceModule } from "../attendance/attendance.module";
import { HomeworkModule } from "../homework/homework.module";
import { StudentPortalService } from "./student-portal.service";
import { StudentPortalController } from "./student-portal.controller";

@Module({
  imports: [AttendanceModule, HomeworkModule],
  controllers: [StudentPortalController],
  providers: [StudentPortalService],
})
export class StudentPortalModule {}
