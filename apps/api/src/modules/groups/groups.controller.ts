import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { GroupsService } from "./groups.service";
import { CreateGroupDto } from "./dto/create-group.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { AssignTeacherDto } from "./dto/assign-teacher.dto";
import { EnrollStudentDto } from "./dto/enroll-student.dto";

@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
@Controller("groups")
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly tenancyService: TenancyService,
  ) {}

  @Get()
  findAll() {
    return this.groupsService.findAll(this.tenancyService.getOrganizationId());
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.groupsService.findOne(this.tenancyService.getOrganizationId(), id);
  }

  @RequirePermission("owner", "admin", "manager")
  @Post()
  create(@Body() dto: CreateGroupDto, @Req() req: Request) {
    return this.groupsService.create(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @RequirePermission("owner", "admin", "manager")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateGroupDto, @Req() req: Request) {
    return this.groupsService.update(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }

  @RequirePermission("owner", "admin", "manager")
  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.groupsService.remove(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
    );
  }

  @Get(":id/teacher-assignments")
  listTeacherAssignments(@Param("id") id: string) {
    return this.groupsService.listTeacherAssignments(this.tenancyService.getOrganizationId(), id);
  }

  @RequirePermission("owner", "admin", "manager")
  @Post(":id/teacher-assignments")
  assignTeacher(@Param("id") id: string, @Body() dto: AssignTeacherDto, @Req() req: Request) {
    return this.groupsService.assignTeacher(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }

  @RequirePermission("owner", "admin", "manager")
  @Patch(":id/teacher-assignments/:assignmentId/end")
  endTeacherAssignment(
    @Param("id") id: string,
    @Param("assignmentId") assignmentId: string,
    @Req() req: Request,
  ) {
    return this.groupsService.endTeacherAssignment(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      assignmentId,
    );
  }

  @Get(":id/memberships")
  listMemberships(@Param("id") id: string) {
    return this.groupsService.listMemberships(this.tenancyService.getOrganizationId(), id);
  }

  @RequirePermission("owner", "admin", "manager")
  @Post(":id/memberships")
  enrollStudent(@Param("id") id: string, @Body() dto: EnrollStudentDto, @Req() req: Request) {
    return this.groupsService.enrollStudent(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }

  @RequirePermission("owner", "admin", "manager")
  @Delete(":id/memberships/:membershipId")
  removeMembership(
    @Param("id") id: string,
    @Param("membershipId") membershipId: string,
    @Req() req: Request,
  ) {
    return this.groupsService.removeMembership(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      membershipId,
    );
  }
}
