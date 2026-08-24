import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { SubscriptionGuard } from "../subscription/subscription.guard";
import { HomeworkService } from "./homework.service";
import { CreateHomeworkDto } from "./dto/create-homework.dto";
import { UpdateHomeworkDto } from "./dto/update-homework.dto";
import { GradeSubmissionDto } from "./dto/grade-submission.dto";
import { HomeworkQueryDto } from "./dto/homework-query.dto";

// Homework is a Growth+ feature — this is the staff-facing CRUD only; the
// student/parent portals read via their own controllers (backed by the same
// HomeworkService), so a Starter org's already-assigned homework still shows
// up there even though staff can't create more.
@UseGuards(AuthenticatedGuard, TenancyGuard, SubscriptionGuard(["growth", "pro"]))
@Controller("homework")
export class HomeworkController {
  constructor(
    private readonly homeworkService: HomeworkService,
    private readonly tenancyService: TenancyService,
  ) {}

  private actorFrom(req: Request) {
    return { userId: (req.user as Express.User).id, roleSlug: req.membership!.role.slug };
  }

  @Post()
  createHomework(@Body() dto: CreateHomeworkDto, @Req() req: Request) {
    return this.homeworkService.createHomework(this.tenancyService.getOrganizationId(), this.actorFrom(req), dto);
  }

  @Get()
  getHomeworkByGroup(@Query() query: HomeworkQueryDto) {
    return this.homeworkService.getHomeworkByGroup(this.tenancyService.getOrganizationId(), query);
  }

  @Get("student/:id")
  getStudentHomework(@Param("id") id: string) {
    return this.homeworkService.getStudentHomework(this.tenancyService.getOrganizationId(), id);
  }

  @Get(":id")
  getHomeworkDetail(@Param("id") id: string) {
    return this.homeworkService.getHomeworkDetail(this.tenancyService.getOrganizationId(), id);
  }

  @Patch(":id")
  updateHomework(@Param("id") id: string, @Body() dto: UpdateHomeworkDto, @Req() req: Request) {
    return this.homeworkService.updateHomework(this.tenancyService.getOrganizationId(), this.actorFrom(req), id, dto);
  }

  @Delete(":id")
  deleteHomework(@Param("id") id: string, @Req() req: Request) {
    return this.homeworkService.deleteHomework(this.tenancyService.getOrganizationId(), this.actorFrom(req), id);
  }

  @Patch("submissions/:id/grade")
  gradeSubmission(@Param("id") id: string, @Body() dto: GradeSubmissionDto, @Req() req: Request) {
    return this.homeworkService.gradeSubmission(this.tenancyService.getOrganizationId(), this.actorFrom(req), id, dto);
  }
}
