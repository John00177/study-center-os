import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { AuditService } from "./audit.service";
import { QueryAuditLogDto } from "./dto/query-audit-log.dto";

@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
@RequirePermission("owner", "admin")
@Controller("audit-logs")
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly tenancyService: TenancyService,
  ) {}

  @Get()
  list(@Query() query: QueryAuditLogDto) {
    return this.auditService.list(this.tenancyService.getOrganizationId(), query);
  }

  @Get("entity-types")
  listEntityTypes() {
    return this.auditService.listEntityTypes(this.tenancyService.getOrganizationId());
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.auditService.findOne(this.tenancyService.getOrganizationId(), id);
  }
}
