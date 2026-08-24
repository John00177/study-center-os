import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuditModule } from "../audit/audit.module";
import { SubscriptionService } from "./subscription.service";
import { SubscriptionLimitsService } from "./subscription-limits.service";
import { SubscriptionController } from "./subscription.controller";

@Module({
  imports: [TenancyModule, AuditModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionLimitsService],
  exports: [SubscriptionService, SubscriptionLimitsService],
})
export class SubscriptionModule {}
