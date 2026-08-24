import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterPushTokenDto } from "./dto/register-push-token.dto";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerPushToken(userId: string, dto: RegisterPushTokenDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: dto.token, pushPlatform: dto.platform },
    });
  }

  /** Mock push send: no real Firebase/APNs wiring — logs what would be sent. */
  private mockSend(token: string, title: string, body: string) {
    this.logger.log(`[PUSH] To: ${token}, Title: ${title}, Body: ${body}`);
  }

  /** Sends to a registered app user (e.g. a teacher) if they have a push token on file. */
  async sendToUser(userId: string, title: string, body: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.pushToken) {
      this.logger.debug(`No push token on file for user ${userId}; skipping push "${title}"`);
      return;
    }
    this.mockSend(user.pushToken, title, body);
  }

  /**
   * Sends to a contact with no app account (e.g. a parent) — there is no
   * Parent<->push-token linkage in this schema yet, so this just mocks
   * delivery against a human-readable label instead of a device token.
   */
  notify(label: string, title: string, body: string) {
    this.mockSend(`contact:${label}`, title, body);
  }
}
