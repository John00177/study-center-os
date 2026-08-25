import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { StudentsService } from "./students.service";
import { AddNoteDto } from "./dto/add-note.dto";
import { ConvertToActiveDto } from "./dto/convert-to-active.dto";
import { CreateStudentDto } from "./dto/create-student.dto";
import { CreateStudentDirectDto } from "./dto/create-student-direct.dto";
import { LinkParentDto } from "./dto/link-parent.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";

const RECEPTION_ROLES = ["owner", "admin", "manager", "reception"];

@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
@Controller("students")
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly tenancyService: TenancyService,
  ) {}

  // Static routes must be declared before the ":id" routes below, or Nest
  // will match e.g. "newcomers" as an :id path param instead.
  @RequirePermission(...RECEPTION_ROLES)
  @Get("newcomers")
  getNewcomers() {
    return this.studentsService.getNewcomers(this.tenancyService.getOrganizationId());
  }

  @RequirePermission(...RECEPTION_ROLES)
  @Get("archived")
  getArchivedStudents() {
    return this.studentsService.getArchivedStudents(this.tenancyService.getOrganizationId());
  }

  @Get("active")
  getActiveStudents() {
    return this.studentsService.getActiveStudents(this.tenancyService.getOrganizationId());
  }

  @Get("stage-counts")
  getStageCounts() {
    return this.studentsService.getStageCounts(this.tenancyService.getOrganizationId());
  }

  @Get()
  findAll() {
    return this.studentsService.findAll(this.tenancyService.getOrganizationId());
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.studentsService.findOne(this.tenancyService.getOrganizationId(), id);
  }

  @RequirePermission("owner", "admin", "manager")
  @Post()
  create(@Body() dto: CreateStudentDto, @Req() req: Request) {
    return this.studentsService.create(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  // Distinct from the newcomer -> convert flow: a receptionist registering a
  // walk-in student straight to active status, with their own login.
  @RequirePermission("reception")
  @Post("direct")
  createDirect(@Body() dto: CreateStudentDirectDto, @Req() req: Request) {
    return this.studentsService.createDirect(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @RequirePermission("owner", "admin", "manager")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateStudentDto, @Req() req: Request) {
    return this.studentsService.update(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }

  @RequirePermission("owner", "admin", "manager")
  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.studentsService.remove(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
    );
  }

  @RequirePermission(...RECEPTION_ROLES)
  @Post(":id/convert")
  convertToActive(@Param("id") id: string, @Body() dto: ConvertToActiveDto, @Req() req: Request) {
    return this.studentsService.convertToActive(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }

  @RequirePermission(...RECEPTION_ROLES)
  @Post(":id/archive")
  archiveStudent(@Param("id") id: string, @Req() req: Request) {
    return this.studentsService.archiveStudent(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
    );
  }

  @RequirePermission("reception")
  @Post(":id/parent")
  linkParent(@Param("id") id: string, @Body() dto: LinkParentDto, @Req() req: Request) {
    return this.studentsService.linkParent(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }

  @RequirePermission(...RECEPTION_ROLES)
  @Get(":id/temp-password")
  getTempPassword(@Param("id") id: string) {
    return this.studentsService.getTempPassword(this.tenancyService.getOrganizationId(), id);
  }

  @RequirePermission(...RECEPTION_ROLES)
  @Post(":id/reset-password")
  resetPassword(@Param("id") id: string, @Req() req: Request) {
    return this.studentsService.resetPassword(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
    );
  }

  @RequirePermission(...RECEPTION_ROLES)
  @Patch(":id/notes")
  addNote(@Param("id") id: string, @Body() dto: AddNoteDto, @Req() req: Request) {
    return this.studentsService.addNote(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }
}
