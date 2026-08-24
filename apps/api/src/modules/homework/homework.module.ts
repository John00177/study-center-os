import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuditModule } from "../audit/audit.module";
import { SubscriptionModule } from "../subscription/subscription.module";
import { HomeworkService } from "./homework.service";
import { HomeworkController } from "./homework.controller";

@Module({
  imports: [TenancyModule, AuditModule, SubscriptionModule],
  controllers: [HomeworkController],
  providers: [HomeworkService],
  exports: [HomeworkService],
})
export class HomeworkModule {}
