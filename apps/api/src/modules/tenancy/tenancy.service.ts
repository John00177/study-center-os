import { Injectable, Scope } from "@nestjs/common";

@Injectable({ scope: Scope.REQUEST })
export class TenancyService {
  private organizationId: string | null = null;
  private userId: string | null = null;

  setContext(organizationId: string, userId: string): void {
    this.organizationId = organizationId;
    this.userId = userId;
  }

  getOrganizationId(): string {
    if (!this.organizationId) {
      throw new Error("Tenancy context has not been set for this request");
    }
    return this.organizationId;
  }

  getUserId(): string {
    if (!this.userId) {
      throw new Error("Tenancy context has not been set for this request");
    }
    return this.userId;
  }
}
