import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { StaffService } from "./staff.service";
import { CreateStaffDto } from "./dto/create-staff.dto";
import { UpdateStaffDto } from "./dto/update-staff.dto";

// Staff membership management (list, create, edit, remove, suspend,
// activate) is owner-only — see Adjustment 2: "Admin sees dashboard but NOT
// staff management."
@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
@RequirePermission("owner")
@Controller("staff")
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly tenancyService: TenancyService,
  ) {}

  @Get()
  getStaffList() {
    return this.staffService.getStaffList(this.tenancyService.getOrganizationId());
  }

  @Post()
  createStaffMember(@Body() dto: CreateStaffDto, @Req() req: Request) {
    return this.staffService.createStaffMember(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @Patch(":userId")
  updateStaffMember(@Param("userId") userId: string, @Body() dto: UpdateStaffDto, @Req() req: Request) {
    return this.staffService.updateStaffMember(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      userId,
      dto,
    );
  }

  @Delete(":userId")
  deleteStaffMember(@Param("userId") userId: string, @Req() req: Request) {
    return this.staffService.deleteStaffMember(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      userId,
    );
  }

  @Post(":userId/suspend")
  suspendMember(@Param("userId") userId: string, @Req() req: Request) {
    return this.staffService.suspendMember(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      userId,
    );
  }

  @Post(":userId/activate")
  activateMember(@Param("userId") userId: string, @Req() req: Request) {
    return this.staffService.activateMember(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      userId,
    );
  }

  @Get(":userId/temp-password")
  getTempPassword(@Param("userId") userId: string) {
    return this.staffService.getTempPassword(this.tenancyService.getOrganizationId(), userId);
  }

  @Post(":userId/reset-password")
  resetPassword(@Param("userId") userId: string, @Req() req: Request) {
    return this.staffService.resetPassword(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      userId,
    );
  }
}
