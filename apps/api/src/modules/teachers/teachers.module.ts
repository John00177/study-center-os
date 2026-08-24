import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuditModule } from "../audit/audit.module";
import { IdentityModule } from "../identity/identity.module";
import { SubscriptionModule } from "../subscription/subscription.module";
import { TeachersService } from "./teachers.service";
import { TeachersController } from "./teachers.controller";

@Module({
  imports: [TenancyModule, AuditModule, IdentityModule, SubscriptionModule],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
