import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { TeacherDashboardGuard } from "../teacher-dashboard/teacher-dashboard.guard";
import { SubscriptionGuard } from "../subscription/subscription.guard";
import { AiTestGeneratorService } from "./ai-test-generator.service";
import { GenerateTestDto } from "./dto/generate-test.dto";
import { CreateTestDto } from "./dto/create-test.dto";
import { UpdateTestDto } from "./dto/update-test.dto";
import { PublishTestDto } from "./dto/publish-test.dto";
import { GradeEssayDto } from "./dto/grade-essay.dto";

// TeacherDashboardGuard is this app's "TeacherGuard" — it enforces
// TeacherDashboardAccess.status === 'active' and resolves req.teacherId.
// AI Test Generator is a Growth+ feature — Starter orgs get 403 with an
// upgrade message on every route here. Students taking an already-published
// test go through StudentTestController instead, which isn't gated.
@UseGuards(AuthenticatedGuard, TenancyGuard, TeacherDashboardGuard, SubscriptionGuard(["growth", "pro"]))
@Controller("ai-tests")
export class AiTestGeneratorController {
  constructor(
    private readonly aiTestGeneratorService: AiTestGeneratorService,
    private readonly tenancyService: TenancyService,
  ) {}

  private teacherId(req: Request): string {
    return req.teacherId!;
  }

  @Post("generate")
  generate(@Body() dto: GenerateTestDto) {
    return this.aiTestGeneratorService.generateTest(dto);
  }

  @Get("summary")
  getSummary(@Req() req: Request) {
    return this.aiTestGeneratorService.getRecentTestsSummary(
      this.tenancyService.getOrganizationId(),
      this.teacherId(req),
    );
  }

  @Post()
  save(@Body() dto: CreateTestDto, @Req() req: Request) {
    return this.aiTestGeneratorService.saveTest(this.tenancyService.getOrganizationId(), this.teacherId(req), dto);
  }

  @Get()
  findAll(
    @Query("status") status: string | undefined,
    @Query("subject") subject: string | undefined,
    @Query("search") search: string | undefined,
    @Req() req: Request,
  ) {
    return this.aiTestGeneratorService.getTests(this.tenancyService.getOrganizationId(), this.teacherId(req), {
      status,
      subject,
      search,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Req() req: Request) {
    return this.aiTestGeneratorService.getTestById(this.tenancyService.getOrganizationId(), this.teacherId(req), id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTestDto, @Req() req: Request) {
    return this.aiTestGeneratorService.updateTest(
      this.tenancyService.getOrganizationId(),
      this.teacherId(req),
      id,
      dto,
    );
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.aiTestGeneratorService.deleteTest(this.tenancyService.getOrganizationId(), this.teacherId(req), id);
  }

  @Post(":id/publish")
  publish(@Param("id") id: string, @Body() dto: PublishTestDto, @Req() req: Request) {
    return this.aiTestGeneratorService.publishTest(
      this.tenancyService.getOrganizationId(),
      this.teacherId(req),
      id,
      dto.groupId,
    );
  }

  @Post(":id/close")
  close(@Param("id") id: string, @Req() req: Request) {
    return this.aiTestGeneratorService.closeTest(this.tenancyService.getOrganizationId(), this.teacherId(req), id);
  }

  @Get(":id/results")
  getResults(@Param("id") id: string, @Req() req: Request) {
    return this.aiTestGeneratorService.getTestResults(
      this.tenancyService.getOrganizationId(),
      this.teacherId(req),
      id,
    );
  }

  @Get(":id/submissions/:submissionId")
  getSubmissionDetail(@Param("id") id: string, @Param("submissionId") submissionId: string, @Req() req: Request) {
    return this.aiTestGeneratorService.getSubmissionDetail(
      this.tenancyService.getOrganizationId(),
      this.teacherId(req),
      id,
      submissionId,
    );
  }

  @Post(":id/submissions/:submissionId/grade")
  gradeEssay(
    @Param("id") id: string,
    @Param("submissionId") submissionId: string,
    @Body() dto: GradeEssayDto,
    @Req() req: Request,
  ) {
    return this.aiTestGeneratorService.gradeEssay(
      this.tenancyService.getOrganizationId(),
      this.teacherId(req),
      id,
      submissionId,
      dto,
    );
  }
}
