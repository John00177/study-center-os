import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { SchedulesService } from "./schedules.service";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import { CalendarQueryDto } from "./dto/calendar-query.dto";
import { ConflictQueryDto } from "./dto/conflict-query.dto";

@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
@Controller("schedules")
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly tenancyService: TenancyService,
    private readonly prisma: PrismaService,
  ) {}

  // Static routes must come before ":id" or Nest will treat "calendar" /
  // "conflicts" as an :id path param.
  @Get("calendar")
  async getCalendar(@Query() query: CalendarQueryDto, @Req() req: Request) {
    const organizationId = this.tenancyService.getOrganizationId();
    const roleSlug = req.membership?.role.slug;

    // A "teacher" role caller only ever sees their own groups, regardless of
    // what ?teacherId= they pass — resolved server-side, not trusted from
    // the query string. Everyone else (owner/admin/manager/reception) gets
    // the org-wide view, optionally narrowed by their own ?teacherId=.
    let forceTeacherId: string | undefined;
    if (roleSlug === "teacher") {
      const user = req.user as Express.User;
      const teacher = await this.prisma.teacher.findFirst({ where: { organizationId, userId: user.id } });
      if (!teacher) {
        throw new ForbiddenException("Teacher dashboard not activated");
      }
      const access = await this.prisma.teacherDashboardAccess.findFirst({
        where: { organizationId, teacherId: teacher.id },
      });
      if (!access || access.status !== "active") {
        throw new ForbiddenException("Teacher dashboard not activated");
      }
      forceTeacherId = teacher.id;
    }

    return this.schedulesService.getCalendarData(organizationId, query, forceTeacherId);
  }

  @Get("conflicts")
  checkConflict(@Query() query: ConflictQueryDto) {
    return this.schedulesService.checkConflict(this.tenancyService.getOrganizationId(), query);
  }

  @Get()
  findAll() {
    return this.schedulesService.findAll(this.tenancyService.getOrganizationId());
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.schedulesService.findOne(this.tenancyService.getOrganizationId(), id);
  }

  @RequirePermission("owner", "admin", "manager")
  @Post()
  create(@Body() dto: CreateScheduleDto, @Req() req: Request) {
    return this.schedulesService.create(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @RequirePermission("owner", "admin", "manager")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateScheduleDto, @Req() req: Request) {
    return this.schedulesService.update(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }

  @RequirePermission("owner", "admin", "manager")
  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.schedulesService.remove(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
    );
  }
}
