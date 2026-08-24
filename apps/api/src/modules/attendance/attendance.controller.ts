import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { AttendanceService } from "./attendance.service";
import { BulkMarkAttendanceDto } from "./dto/bulk-mark-attendance.dto";

@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
@Controller("attendance")
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly tenancyService: TenancyService,
  ) {}

  @Get()
  findForGroupAndDate(@Query("groupId") groupId?: string, @Query("date") date?: string) {
    if (!groupId || !date) {
      throw new BadRequestException("Both groupId and date query parameters are required");
    }
    return this.attendanceService.findForGroupAndDate(this.tenancyService.getOrganizationId(), groupId, date);
  }

  @Get("student/:id")
  findForStudent(@Param("id") id: string) {
    return this.attendanceService.findForStudent(this.tenancyService.getOrganizationId(), id);
  }

  @RequirePermission("owner", "admin", "manager")
  @Post("bulk")
  bulkMark(@Body() dto: BulkMarkAttendanceDto, @Req() req: Request) {
    return this.attendanceService.bulkMark(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }
}
