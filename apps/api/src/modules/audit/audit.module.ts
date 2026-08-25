import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuditService } from "./audit.service";
import { AuditController } from "./audit.controller";

@Module({
  imports: [TenancyModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
