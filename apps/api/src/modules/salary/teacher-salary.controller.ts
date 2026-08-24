import { Controller, ForbiddenException, Get, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { TeacherDashboardGuard } from "../teacher-dashboard/teacher-dashboard.guard";
import { SalaryService } from "./salary.service";

// Mirrors TeacherDashboardController's guard stack so a teacher only ever
// sees their own salary (req.teacherId, never a URL param — see that
// controller's rationale). Owner/admin viewing via ?teacherId= also works
// since TeacherDashboardGuard sets req.teacherId for them too.
@UseGuards(AuthenticatedGuard, TenancyGuard, TeacherDashboardGuard)
@Controller("teacher")
export class TeacherSalaryController {
  constructor(
    private readonly salaryService: SalaryService,
    private readonly tenancyService: TenancyService,
  ) {}

  @Get("salary")
  getMySalary(@Req() req: Request) {
    if (!req.teacherId) {
      throw new ForbiddenException("Teacher dashboard not activated");
    }
    return this.salaryService.getTeacherOwnSalary(this.tenancyService.getOrganizationId(), req.teacherId);
  }
}
