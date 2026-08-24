import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { IdentityModule } from "../identity/identity.module";
import { StudentsModule } from "../students/students.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { SessionSerializer } from "./session.serializer";

@Module({
  imports: [PassportModule.register({ session: true }), IdentityModule, StudentsModule],
  controllers: [AuthController],
  providers: [AuthService, SessionSerializer],
  exports: [AuthService],
})
export class AuthModule {}
