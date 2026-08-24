import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { UpdateBrandingDto } from "./dto/update-branding.dto";

const BRANDING_SELECT = {
  name: true,
  slug: true,
  logoUrl: true,
  primaryColor: true,
  accentColor: true,
  faviconUrl: true,
};

const FULL_BRANDING_SELECT = {
  ...BRANDING_SELECT,
  theme: true,
  language: true,
  dateFormat: true,
  timeFormat: true,
  customDomain: true,
};

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** Public — used by login pages before the visitor is authenticated. */
  async getBrandingBySlug(slug: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
      select: BRANDING_SELECT,
    });
    if (!organization) {
      throw new NotFoundException("Organization not found");
    }
    return organization;
  }

  async getMyBranding(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: FULL_BRANDING_SELECT,
    });
    if (!organization) {
      throw new NotFoundException("Organization not found");
    }
    return organization;
  }

  async updateBranding(organizationId: string, actorId: string, dto: UpdateBrandingDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: FULL_BRANDING_SELECT,
    });
    if (!existing) {
      throw new NotFoundException("Organization not found");
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: dto,
      select: FULL_BRANDING_SELECT,
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "organization.branding_updated",
      entityType: "Organization",
      entityId: organizationId,
      beforeValue: existing,
      afterValue: updated,
    });

    return updated;
  }

  async saveLogo(organizationId: string, actorId: string, logoUrl: string) {
    const existing = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { logoUrl: true },
    });

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { logoUrl },
      select: FULL_BRANDING_SELECT,
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "organization.logo_uploaded",
      entityType: "Organization",
      entityId: organizationId,
      beforeValue: existing ?? undefined,
      afterValue: { logoUrl },
    });

    return updated;
  }
}
