import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { ClassroomsService } from "./classrooms.service";
import { ClassroomsController } from "./classrooms.controller";

@Module({
  imports: [TenancyModule],
  controllers: [ClassroomsController],
  providers: [ClassroomsService],
  exports: [ClassroomsService],
})
export class ClassroomsModule {}
