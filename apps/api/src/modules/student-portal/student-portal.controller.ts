import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { StudentPortalGuard } from "./student-portal.guard";
import { StudentPortalService } from "./student-portal.service";

// Every handler derives studentId/organizationId purely from the session
// (never a URL param) — there is nothing for a student to spoof by editing
// the request, unlike a param-based "does :id match my session" check.
@UseGuards(StudentPortalGuard)
@Controller("student")
export class StudentPortalController {
  constructor(private readonly studentPortalService: StudentPortalService) {}

  private context(req: Request) {
    return { organizationId: req.session.studentOrganizationId!, studentId: req.session.studentId! };
  }

  @Get("dashboard")
  getDashboard(@Req() req: Request) {
    const { organizationId, studentId } = this.context(req);
    return this.studentPortalService.getStudentDashboard(organizationId, studentId);
  }

  @Get("schedule")
  getSchedule(@Req() req: Request) {
    const { organizationId, studentId } = this.context(req);
    return this.studentPortalService.getStudentSchedule(organizationId, studentId);
  }

  @Get("attendance")
  getAttendance(@Req() req: Request) {
    const { organizationId, studentId } = this.context(req);
    return this.studentPortalService.getStudentAttendance(organizationId, studentId);
  }

  @Get("homework")
  getHomework(@Req() req: Request) {
    const { organizationId, studentId } = this.context(req);
    return this.studentPortalService.getStudentHomework(organizationId, studentId);
  }

  @Get("payments")
  getPayments(@Req() req: Request) {
    const { organizationId, studentId } = this.context(req);
    return this.studentPortalService.getStudentPayments(organizationId, studentId);
  }
}
