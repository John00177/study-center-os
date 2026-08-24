import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { TeacherDashboardGuard } from "../teacher-dashboard/teacher-dashboard.guard";
import { StudentPortalGuard } from "../student-portal/student-portal.guard";
import { SubscriptionModule } from "../subscription/subscription.module";
import { AiTestGeneratorService } from "./ai-test-generator.service";
import { AiTestGeneratorController } from "./ai-test-generator.controller";
import { StudentTestService } from "./student-test.service";
import { StudentTestController } from "./student-test.controller";

@Module({
  imports: [TenancyModule, SubscriptionModule],
  controllers: [AiTestGeneratorController, StudentTestController],
  // TeacherDashboardGuard/StudentPortalGuard aren't exported by their home
  // modules, so they're registered directly here — both depend only on
  // PrismaService (or nothing), which comes from the @Global() PrismaModule.
  providers: [AiTestGeneratorService, TeacherDashboardGuard, StudentTestService, StudentPortalGuard],
})
export class AiTestGeneratorModule {}
