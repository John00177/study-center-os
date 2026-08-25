import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { NotificationsService } from "./notifications.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";

// The bell-icon notification feed — separate from NotificationsController's
// /users/push-token route, which is about mock device push delivery, not
// this persisted per-user list. Scoped entirely by the caller's own user id;
// there is no organizationId on Notification, so no TenancyGuard here.
@UseGuards(AuthenticatedGuard)
@Controller("notifications")
export class NotificationFeedController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Manual/internal use (e.g. a teammate pinging another) — auto-triggered
  // notifications on real events are created directly via
  // NotificationsService from the relevant domain services, not through
  // this route.
  @UseGuards(TenancyGuard, PermissionGuard)
  @RequirePermission("owner", "admin")
  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Get()
  findAll(@Query("page") page: string | undefined, @Query("limit") limit: string | undefined, @Req() req: Request) {
    const userId = (req.user as Express.User).id;
    return this.notificationsService.findAll(userId, page ? Number(page) : undefined, limit ? Number(limit) : undefined);
  }

  @Get("unread-count")
  getUnreadCount(@Req() req: Request) {
    return this.notificationsService.getUnreadCount((req.user as Express.User).id);
  }

  @Patch("read-all")
  markAllAsRead(@Req() req: Request) {
    return this.notificationsService.markAllAsRead((req.user as Express.User).id);
  }

  @Patch(":id/read")
  markAsRead(@Param("id") id: string, @Req() req: Request) {
    return this.notificationsService.markAsRead(id, (req.user as Express.User).id);
  }

  @Delete("dismiss-all")
  dismissAll(@Req() req: Request) {
    return this.notificationsService.deleteAll((req.user as Express.User).id);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.notificationsService.delete(id, (req.user as Express.User).id);
  }
}
