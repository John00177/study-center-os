import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { StaffService } from "./staff.service";
import { CreateReceptionistDto } from "./dto/create-receptionist.dto";

// Staff membership management (list, suspend, activate) is owner-only — see
// Adjustment 2: "Admin sees dashboard but NOT staff management."
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

  // Receptionist account creation is owner/admin (broader than the rest of
  // this controller, which is owner-only) — method-level @RequirePermission
  // overrides the class-level one via Reflector's getAllAndOverride.
  @RequirePermission("owner", "admin")
  @Post("receptionists")
  createReceptionist(@Body() dto: CreateReceptionistDto, @Req() req: Request) {
    return this.staffService.createReceptionist(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @RequirePermission("owner", "admin")
  @Get(":userId/temp-password")
  getTempPassword(@Param("userId") userId: string) {
    return this.staffService.getTempPassword(this.tenancyService.getOrganizationId(), userId);
  }

  @RequirePermission("owner", "admin")
  @Post(":userId/reset-password")
  resetPassword(@Param("userId") userId: string, @Req() req: Request) {
    return this.staffService.resetPassword(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      userId,
    );
  }
}
