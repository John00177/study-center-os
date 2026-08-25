import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationFeedController } from "./notification-feed.controller";

@Module({
  imports: [TenancyModule],
  controllers: [NotificationsController, NotificationFeedController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
