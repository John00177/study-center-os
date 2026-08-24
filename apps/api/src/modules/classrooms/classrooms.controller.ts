import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { ClassroomsService } from "./classrooms.service";
import { CreateClassroomDto } from "./dto/create-classroom.dto";

@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
@Controller("classrooms")
export class ClassroomsController {
  constructor(
    private readonly classroomsService: ClassroomsService,
    private readonly tenancyService: TenancyService,
  ) {}

  @Get()
  findAll() {
    return this.classroomsService.findAll(this.tenancyService.getOrganizationId());
  }

  @RequirePermission("owner", "admin", "manager")
  @Post()
  create(@Body() dto: CreateClassroomDto) {
    return this.classroomsService.create(this.tenancyService.getOrganizationId(), dto);
  }
}
