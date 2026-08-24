import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { TeachersService } from "./teachers.service";
import { CreateTeacherDto } from "./dto/create-teacher.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.dto";

@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
@Controller("teachers")
export class TeachersController {
  constructor(
    private readonly teachersService: TeachersService,
    private readonly tenancyService: TenancyService,
  ) {}

  @Get()
  findAll() {
    return this.teachersService.findAll(this.tenancyService.getOrganizationId());
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.teachersService.findOne(this.tenancyService.getOrganizationId(), id);
  }

  @RequirePermission("owner", "admin")
  @Post()
  create(@Body() dto: CreateTeacherDto, @Req() req: Request) {
    return this.teachersService.create(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @RequirePermission("owner", "admin")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTeacherDto, @Req() req: Request) {
    return this.teachersService.update(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }

  @RequirePermission("owner", "admin")
  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.teachersService.remove(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
    );
  }

  @RequirePermission("owner", "admin")
  @Get(":id/temp-password")
  getTempPassword(@Param("id") id: string) {
    return this.teachersService.getTempPassword(this.tenancyService.getOrganizationId(), id);
  }

  @RequirePermission("owner", "admin")
  @Post(":id/reset-password")
  resetPassword(@Param("id") id: string, @Req() req: Request) {
    return this.teachersService.resetPassword(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
    );
  }

  @RequirePermission("owner", "admin")
  @Post(":id/dashboard-access/activate")
  activateDashboardAccess(@Param("id") id: string, @Req() req: Request) {
    return this.teachersService.activateDashboardAccess(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
    );
  }

  @RequirePermission("owner", "admin")
  @Post(":id/dashboard-access/suspend")
  suspendDashboardAccess(@Param("id") id: string, @Req() req: Request) {
    return this.teachersService.suspendDashboardAccess(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
    );
  }
}
