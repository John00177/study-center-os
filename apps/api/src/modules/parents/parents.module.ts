import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuditModule } from "../audit/audit.module";
import { ParentsService } from "./parents.service";
import { ParentsController } from "./parents.controller";

@Module({
  imports: [TenancyModule, AuditModule],
  controllers: [ParentsController],
  providers: [ParentsService],
  exports: [ParentsService],
})
export class ParentsModule {}
