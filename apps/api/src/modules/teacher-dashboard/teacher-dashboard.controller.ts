import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { TeacherDashboardGuard } from "./teacher-dashboard.guard";
import { TeacherDashboardService } from "./teacher-dashboard.service";
import { CreateLessonNoteDto } from "./dto/create-lesson-note.dto";
import { MarkGroupAttendanceDto } from "./dto/mark-group-attendance.dto";

@UseGuards(AuthenticatedGuard, TenancyGuard, TeacherDashboardGuard)
@Controller("teacher")
export class TeacherDashboardController {
  constructor(
    private readonly teacherDashboardService: TeacherDashboardService,
    private readonly tenancyService: TenancyService,
  ) {}

  @Get("groups")
  getMyGroups(@Req() req: Request) {
    return this.teacherDashboardService.getMyGroups(this.tenancyService.getOrganizationId(), req.teacherId);
  }

  @Get("students")
  getAllStudents(@Req() req: Request) {
    return this.teacherDashboardService.getAllStudents(this.tenancyService.getOrganizationId(), req.teacherId);
  }

  @Get("groups/:id/students")
  getGroupStudents(@Param("id") id: string, @Req() req: Request) {
    return this.teacherDashboardService.getGroupStudents(
      this.tenancyService.getOrganizationId(),
      id,
      req.teacherId,
    );
  }

  @Get("groups/:id/attendance")
  getGroupAttendance(@Param("id") id: string, @Query("date") date: string | undefined, @Req() req: Request) {
    if (!date) {
      throw new BadRequestException("date query parameter is required");
    }
    return this.teacherDashboardService.getGroupAttendance(
      this.tenancyService.getOrganizationId(),
      id,
      req.teacherId,
      date,
    );
  }

  @Post("groups/:id/attendance")
  markGroupAttendance(@Param("id") id: string, @Body() dto: MarkGroupAttendanceDto, @Req() req: Request) {
    return this.teacherDashboardService.markGroupAttendance(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      req.teacherId,
      dto,
    );
  }

  @Post("groups/:id/lessons")
  createLessonNote(@Param("id") id: string, @Body() dto: CreateLessonNoteDto, @Req() req: Request) {
    return this.teacherDashboardService.createLessonNote(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      req.teacherId,
      dto,
    );
  }

  @Get("groups/:id/lessons")
  getLessonNotes(@Param("id") id: string, @Req() req: Request) {
    return this.teacherDashboardService.getLessonNotes(
      this.tenancyService.getOrganizationId(),
      id,
      req.teacherId,
    );
  }
}
