import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuditModule } from "../audit/audit.module";
import { SubscriptionModule } from "../subscription/subscription.module";
import { BranchesService } from "./branches.service";
import { BranchesController } from "./branches.controller";

@Module({
  imports: [TenancyModule, AuditModule, SubscriptionModule],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
