import { Injectable } from "@nestjs/common";
import { PassportSerializer } from "@nestjs/passport";
import { User } from "@prisma/client";
import { IdentityService } from "../identity/identity.service";

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly identityService: IdentityService) {
    super();
  }

  serializeUser(user: User, done: (err: Error | null, id: string) => void): void {
    done(null, user.id);
  }

  async deserializeUser(
    id: string,
    done: (err: Error | null, user: Express.User | false) => void,
  ): Promise<void> {
    const user = await this.identityService.findById(id);
    if (!user || user.status !== "active") {
      done(null, false);
      return;
    }

    done(null, {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      isPlatformAdmin: user.isPlatformAdmin,
      mustChangePassword: user.mustChangePassword,
    });
  }
}
