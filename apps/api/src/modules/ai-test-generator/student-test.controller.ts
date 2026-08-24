import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { StudentPortalGuard } from "../student-portal/student-portal.guard";
import { StudentTestService } from "./student-test.service";
import { SubmitTestDto } from "./dto/submit-test.dto";

@UseGuards(StudentPortalGuard)
@Controller("student/tests")
export class StudentTestController {
  constructor(private readonly studentTestService: StudentTestService) {}

  private context(req: Request) {
    return { organizationId: req.session.studentOrganizationId!, studentId: req.session.studentId! };
  }

  @Get()
  getAvailableTests(@Req() req: Request) {
    const { organizationId, studentId } = this.context(req);
    return this.studentTestService.getAvailableTests(organizationId, studentId);
  }

  @Get(":id")
  getTestForTaking(@Param("id") id: string, @Req() req: Request) {
    const { organizationId, studentId } = this.context(req);
    return this.studentTestService.getTestForTaking(organizationId, studentId, id);
  }

  @Post(":id/submit")
  submitTest(@Param("id") id: string, @Body() dto: SubmitTestDto, @Req() req: Request) {
    const { organizationId, studentId } = this.context(req);
    return this.studentTestService.submitTest(organizationId, studentId, id, dto);
  }

  @Get(":id/result")
  getOwnResult(@Param("id") id: string, @Req() req: Request) {
    const { organizationId, studentId } = this.context(req);
    return this.studentTestService.getOwnResult(organizationId, studentId, id);
  }
}
