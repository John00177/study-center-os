import { Module } from "@nestjs/common";
import { AttendanceModule } from "../attendance/attendance.module";
import { HomeworkModule } from "../homework/homework.module";
import { SubscriptionModule } from "../subscription/subscription.module";
import { ParentPortalService } from "./parent-portal.service";
import { ParentPortalController } from "./parent-portal.controller";
import { ParentPortalGuard } from "./parent-portal.guard";

@Module({
  imports: [AttendanceModule, HomeworkModule, SubscriptionModule],
  controllers: [ParentPortalController],
  providers: [ParentPortalService, ParentPortalGuard],
})
export class ParentPortalModule {}
