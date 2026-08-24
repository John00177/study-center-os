import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuditModule } from "../audit/audit.module";
import { IdentityModule } from "../identity/identity.module";
import { StaffService } from "./staff.service";
import { StaffController } from "./staff.controller";

@Module({
  imports: [TenancyModule, AuditModule, IdentityModule],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
