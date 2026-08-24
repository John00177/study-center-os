import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Foundation hook for future Postgres RLS enforcement (session-scoped
   * `app.current_organization_id`). Not yet wired into a Prisma middleware —
   * see docs/architecture/rls.md. Tenant isolation today is enforced at the
   * application layer via TenancyGuard/TenancyService.
   */
  async setTenant(_organizationId: string): Promise<void> {
    return;
  }
}
