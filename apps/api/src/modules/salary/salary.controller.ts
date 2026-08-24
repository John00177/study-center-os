import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { SalaryService } from "./salary.service";
import { SetSalaryDto } from "./dto/set-salary.dto";
import { RecordSalaryPaymentDto } from "./dto/record-salary-payment.dto";

const STAFF_ROLES = ["owner", "admin"];

// Salary data is as sensitive as finance data — owner/admin only, same gate
// shape as FinanceController. Teachers get their own read-only view via
// TeacherSalaryController below, never this controller.
@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
@RequirePermission(...STAFF_ROLES)
@Controller("salaries")
export class SalaryController {
  constructor(
    private readonly salaryService: SalaryService,
    private readonly tenancyService: TenancyService,
  ) {}

  @Get()
  getAllSalaries() {
    return this.salaryService.getAllSalaries(this.tenancyService.getOrganizationId());
  }

  @Get("analytics")
  getSalaryAnalytics() {
    return this.salaryService.getSalaryAnalytics(this.tenancyService.getOrganizationId());
  }

  @Post()
  setSalary(@Body() dto: SetSalaryDto, @Req() req: Request) {
    return this.salaryService.setTeacherSalary(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @Get(":id/payments")
  getPaymentHistory(@Param("id") id: string) {
    return this.salaryService.getSalaryPaymentHistory(this.tenancyService.getOrganizationId(), id);
  }

  @Post("pay-all")
  markAllPaid(@Req() req: Request) {
    return this.salaryService.markAllPaidForCurrentMonth(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
    );
  }

  @Post(":id/pay")
  recordPayment(@Param("id") id: string, @Body() dto: RecordSalaryPaymentDto, @Req() req: Request) {
    return this.salaryService.recordSalaryPayment(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }
}
