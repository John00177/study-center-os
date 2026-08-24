import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { NotificationsService } from "./notifications.service";
import { RegisterPushTokenDto } from "./dto/register-push-token.dto";

@UseGuards(AuthenticatedGuard)
@Controller("users")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post("push-token")
  registerPushToken(@Body() dto: RegisterPushTokenDto, @Req() req: Request) {
    return this.notificationsService.registerPushToken((req.user as Express.User).id, dto);
  }
}
