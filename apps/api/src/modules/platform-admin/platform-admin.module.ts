import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PlatformAdminService } from "./platform-admin.service";
import { PlatformAdminController } from "./platform-admin.controller";

@Module({
  imports: [AuditModule],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService],
})
export class PlatformAdminModule {}
