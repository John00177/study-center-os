import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { StudentPortalGuard } from "../student-portal/student-portal.guard";
import { ParentPortalGuard } from "../parent-portal/parent-portal.guard";
import { PlatformAdminGuard } from "../platform-admin/platform-admin.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { SupportTicketsService, TicketListFilters } from "./support-tickets.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { UpdateTicketDto } from "./dto/update-ticket.dto";

const STAFF_ROLES = ["owner", "admin"];

@Controller()
export class SupportTicketsController {
  constructor(
    private readonly ticketsService: SupportTicketsService,
    private readonly tenancyService: TenancyService,
    private readonly prisma: PrismaService,
  ) {}

  // ---- Create (any authenticated identity) ----

  @UseGuards(AuthenticatedGuard, TenancyGuard)
  @Post("support-tickets")
  async createStaffTicket(@Body() dto: CreateTicketDto, @Req() req: Request) {
    const user = req.user as Express.User;
    const roleSlug = req.membership?.role.slug ?? "owner";
    return this.ticketsService.createTicket(dto, {
      submitterType: roleSlug,
      submitterId: user.id,
      submitterName: user.name,
      organizationId: this.tenancyService.getOrganizationId(),
      contactEmail: user.email,
    });
  }

  @UseGuards(StudentPortalGuard)
  @Post("student/support-tickets")
  async createStudentTicket(@Body() dto: CreateTicketDto, @Req() req: Request) {
    const student = await this.prisma.student.findFirst({ where: { id: req.session.studentId! } });
    return this.ticketsService.createTicket(dto, {
      submitterType: "student",
      submitterId: req.session.studentId!,
      submitterName: student?.name ?? "Student",
      organizationId: req.session.studentOrganizationId!,
      contactEmail: student?.email,
      contactPhone: student?.phone,
    });
  }

  @UseGuards(ParentPortalGuard)
  @Post("parent/support-tickets")
  async createParentTicket(@Body() dto: CreateTicketDto, @Req() req: Request) {
    const student = await this.prisma.student.findFirst({ where: { id: req.session.parentStudentId! } });
    return this.ticketsService.createTicket(dto, {
      submitterType: "parent",
      submitterId: req.session.parentStudentId!,
      submitterName: student?.parentName ?? "Parent",
      organizationId: req.session.parentOrganizationId!,
      contactEmail: student?.parentEmail,
      contactPhone: student?.parentPhone,
    });
  }

  @UseGuards(AuthenticatedGuard, PlatformAdminGuard)
  @Post("admin/support-tickets")
  async createPlatformAdminTicket(@Body() dto: CreateTicketDto, @Req() req: Request) {
    const user = req.user as Express.User;
    return this.ticketsService.createTicket(dto, {
      submitterType: "platform_admin",
      submitterId: user.id,
      submitterName: user.name,
      organizationId: null,
      contactEmail: user.email,
    });
  }

  // ---- My tickets (any authenticated identity) ----

  @UseGuards(AuthenticatedGuard, TenancyGuard)
  @Get("support-tickets/my")
  getMyStaffTickets(@Req() req: Request) {
    const user = req.user as Express.User;
    const roleSlug = req.membership?.role.slug ?? "owner";
    return this.ticketsService.getMyTickets(roleSlug, user.id);
  }

  @UseGuards(StudentPortalGuard)
  @Get("student/support-tickets/my")
  getMyStudentTickets(@Req() req: Request) {
    return this.ticketsService.getMyTickets("student", req.session.studentId!);
  }

  @UseGuards(ParentPortalGuard)
  @Get("parent/support-tickets/my")
  getMyParentTickets(@Req() req: Request) {
    return this.ticketsService.getMyTickets("parent", req.session.parentStudentId!);
  }

  // ---- Owner/admin: org-scoped ticket management ----

  @UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
  @RequirePermission(...STAFF_ROLES)
  @Get("support-tickets")
  getOrgTickets(@Query() query: TicketListFilters) {
    return this.ticketsService.getTicketsForOrganization(this.tenancyService.getOrganizationId(), query);
  }

  @UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
  @RequirePermission(...STAFF_ROLES)
  @Get("support-tickets/summary")
  getOrgSummary() {
    return this.ticketsService.getSummary(this.tenancyService.getOrganizationId());
  }

  @UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
  @RequirePermission(...STAFF_ROLES)
  @Get("support-tickets/:id")
  getOrgTicket(@Param("id") id: string) {
    return this.ticketsService.getTicketByIdForOrganization(id, this.tenancyService.getOrganizationId());
  }

  @UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
  @RequirePermission(...STAFF_ROLES)
  @Patch("support-tickets/:id")
  updateOrgTicket(@Param("id") id: string, @Body() dto: UpdateTicketDto, @Req() req: Request) {
    return this.ticketsService.updateTicketAsOrganization(
      id,
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
  @RequirePermission(...STAFF_ROLES)
  @Post("support-tickets/bulk-update")
  bulkUpdateOrgTickets(@Body() body: { ids: string[]; status: string }, @Req() req: Request) {
    return this.ticketsService.bulkUpdateStatus(body.ids, body.status, (req.user as Express.User).id, {
      organizationId: this.tenancyService.getOrganizationId(),
    });
  }

  // ---- Platform admin: all tickets across all orgs ----

  @UseGuards(AuthenticatedGuard, PlatformAdminGuard)
  @Get("admin/support-tickets")
  getAllTickets(@Query() query: TicketListFilters) {
    return this.ticketsService.getAllTicketsForPlatformAdmin(query);
  }

  @UseGuards(AuthenticatedGuard, PlatformAdminGuard)
  @Get("admin/support-tickets/summary")
  getPlatformSummary() {
    return this.ticketsService.getSummary();
  }

  @UseGuards(AuthenticatedGuard, PlatformAdminGuard)
  @Get("admin/support-tickets/:id")
  getTicket(@Param("id") id: string) {
    return this.ticketsService.getTicketByIdForPlatformAdmin(id);
  }

  @UseGuards(AuthenticatedGuard, PlatformAdminGuard)
  @Patch("admin/support-tickets/:id")
  updateTicket(@Param("id") id: string, @Body() dto: UpdateTicketDto, @Req() req: Request) {
    return this.ticketsService.updateTicketAsPlatformAdmin(id, (req.user as Express.User).id, dto);
  }

  @UseGuards(AuthenticatedGuard, PlatformAdminGuard)
  @Post("admin/support-tickets/bulk-update")
  bulkUpdateTickets(@Body() body: { ids: string[]; status: string }, @Req() req: Request) {
    if (!body.ids?.length) {
      throw new ForbiddenException("No tickets selected");
    }
    return this.ticketsService.bulkUpdateStatus(body.ids, body.status, (req.user as Express.User).id);
  }
}
