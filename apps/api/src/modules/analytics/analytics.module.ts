import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { IdentityModule } from "../identity/identity.module";
import { SubscriptionModule } from "../subscription/subscription.module";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsController } from "./analytics.controller";

@Module({
  imports: [TenancyModule, IdentityModule, SubscriptionModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
