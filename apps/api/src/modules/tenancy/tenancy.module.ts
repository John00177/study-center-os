import { Module } from "@nestjs/common";
import { TenancyService } from "./tenancy.service";
import { TenancyGuard } from "./tenancy.guard";

@Module({
  providers: [TenancyService, TenancyGuard],
  exports: [TenancyService, TenancyGuard],
})
export class TenancyModule {}
