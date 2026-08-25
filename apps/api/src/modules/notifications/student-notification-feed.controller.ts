import { Controller, Delete, Get, Param, Patch, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { StudentPortalGuard } from "../student-portal/student-portal.guard";
import { NotificationsService } from "./notifications.service";

/**
 * The student portal's own bell feed. Mirrors NotificationFeedController but
 * scoped to recipientType "student" — students have no User row and use a
 * separate lightweight session (see StudentPortalGuard), so their rows are
 * keyed by Student.id and must never be reachable from the staff routes.
 */
@UseGuards(StudentPortalGuard)
@Controller("student/notifications")
export class StudentNotificationFeedController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Query("page") page: string | undefined, @Query("limit") limit: string | undefined, @Req() req: Request) {
    return this.notificationsService.findAll(
      req.session.studentId!,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      "student",
    );
  }

  @Get("unread-count")
  getUnreadCount(@Req() req: Request) {
    return this.notificationsService.getUnreadCount(req.session.studentId!, "student");
  }

  @Patch("read-all")
  markAllAsRead(@Req() req: Request) {
    return this.notificationsService.markAllAsRead(req.session.studentId!, "student");
  }

  @Patch(":id/read")
  markAsRead(@Param("id") id: string, @Req() req: Request) {
    return this.notificationsService.markAsRead(id, req.session.studentId!, "student");
  }

  @Delete("dismiss-all")
  dismissAll(@Req() req: Request) {
    return this.notificationsService.deleteAll(req.session.studentId!, "student");
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.notificationsService.delete(id, req.session.studentId!, "student");
  }
}
