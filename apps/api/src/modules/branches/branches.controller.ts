import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { BranchesService } from "./branches.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
@Controller("branches")
export class BranchesController {
  constructor(
    private readonly branchesService: BranchesService,
    private readonly tenancyService: TenancyService,
  ) {}

  @Get()
  findAll() {
    return this.branchesService.findAll(this.tenancyService.getOrganizationId());
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.branchesService.findOne(this.tenancyService.getOrganizationId(), id);
  }

  @RequirePermission("owner", "admin")
  @Post()
  create(@Body() dto: CreateBranchDto, @Req() req: Request) {
    return this.branchesService.create(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @RequirePermission("owner", "admin")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateBranchDto, @Req() req: Request) {
    return this.branchesService.update(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }

  @RequirePermission("owner", "admin")
  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.branchesService.remove(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
    );
  }
}
