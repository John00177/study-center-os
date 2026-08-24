import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuditModule } from "../audit/audit.module";
import { IdentityModule } from "../identity/identity.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SubscriptionModule } from "../subscription/subscription.module";
import { RemindersService } from "./reminders.service";
import { RemindersController } from "./reminders.controller";

@Module({
  imports: [TenancyModule, AuditModule, IdentityModule, NotificationsModule, SubscriptionModule],
  controllers: [RemindersController],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
