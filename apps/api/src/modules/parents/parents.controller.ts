import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { ParentsService } from "./parents.service";
import { CreateParentDto } from "./dto/create-parent.dto";
import { UpdateParentDto } from "./dto/update-parent.dto";

@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
@Controller("parents")
export class ParentsController {
  constructor(
    private readonly parentsService: ParentsService,
    private readonly tenancyService: TenancyService,
  ) {}

  @Get()
  findAll() {
    return this.parentsService.findAll(this.tenancyService.getOrganizationId());
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.parentsService.findOne(this.tenancyService.getOrganizationId(), id);
  }

  @RequirePermission("owner", "admin", "manager")
  @Post()
  create(@Body() dto: CreateParentDto, @Req() req: Request) {
    return this.parentsService.create(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @RequirePermission("owner", "admin", "manager")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateParentDto, @Req() req: Request) {
    return this.parentsService.update(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }

  @RequirePermission("owner", "admin", "manager")
  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.parentsService.remove(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
    );
  }
}
