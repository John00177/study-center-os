import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ParentPortalGuard } from "./parent-portal.guard";
import { SubscriptionGuard } from "../subscription/subscription.guard";
import { ParentPortalService } from "./parent-portal.service";

// Every handler derives studentId/organizationId purely from the session
// (never a URL param) — same rationale as StudentPortalController: nothing
// for a parent to spoof by editing the request.
// Parent Portal is a Pro-only feature — a parent whose org has downgraded
// (or never had Pro) still holds a valid session, so this must block them
// at the API rather than relying on the org simply not sending out parent
// logins.
@UseGuards(ParentPortalGuard, SubscriptionGuard(["pro"]))
@Controller("parent")
export class ParentPortalController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  private context(req: Request) {
    return { organizationId: req.session.parentOrganizationId!, studentId: req.session.parentStudentId! };
  }

  @Get("dashboard")
  getDashboard(@Req() req: Request) {
    const { organizationId, studentId } = this.context(req);
    return this.parentPortalService.getDashboard(organizationId, studentId);
  }

  @Get("schedule")
  getSchedule(@Req() req: Request) {
    const { organizationId, studentId } = this.context(req);
    return this.parentPortalService.getSchedule(organizationId, studentId);
  }

  @Get("attendance")
  getAttendance(@Req() req: Request) {
    const { organizationId, studentId } = this.context(req);
    return this.parentPortalService.getAttendance(organizationId, studentId);
  }

  @Get("homework")
  getHomework(@Req() req: Request) {
    const { organizationId, studentId } = this.context(req);
    return this.parentPortalService.getHomework(organizationId, studentId);
  }

  @Get("teachers")
  getTeachers(@Req() req: Request) {
    const { organizationId, studentId } = this.context(req);
    return this.parentPortalService.getTeachers(organizationId, studentId);
  }

  @Get("payments")
  getPayments(@Req() req: Request) {
    const { organizationId, studentId } = this.context(req);
    return this.parentPortalService.getPayments(organizationId, studentId);
  }
}
