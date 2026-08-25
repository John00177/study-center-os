import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SubscriptionModule } from "../subscription/subscription.module";
import { StudentsService } from "./students.service";
import { StudentsController } from "./students.controller";

@Module({
  imports: [TenancyModule, AuditModule, SubscriptionModule, NotificationsModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
