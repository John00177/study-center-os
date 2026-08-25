import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { PermissionSlugGuard } from "../auth/guards/permission-slug.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequirePermissionSlug } from "../../common/decorators/require-permission-slug.decorator";
import { FinanceService } from "./finance.service";
import { CreateFinancialAccountDto } from "./dto/create-financial-account.dto";
import { UpdateFinancialAccountDto } from "./dto/update-financial-account.dto";
import { CreateChargeDto } from "./dto/create-charge.dto";
import { UpdateChargeDto } from "./dto/update-charge.dto";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";
import { ChargesQueryDto } from "./dto/charges-query.dto";

// Finance data is never returned to a caller who lacks the "finance.view"
// permission on their role — this is enforced org-wide for every route here,
// not just the reads, since the mandate is "never returned", full stop.
@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard, PermissionSlugGuard)
@RequirePermissionSlug("finance.view")
@Controller("finance")
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly tenancyService: TenancyService,
  ) {}

  // Accounts
  @Get("accounts")
  findAllAccounts() {
    return this.financeService.findAllAccounts(this.tenancyService.getOrganizationId());
  }

  @Get("accounts/:id")
  findOneAccount(@Param("id") id: string) {
    return this.financeService.findOneAccount(this.tenancyService.getOrganizationId(), id);
  }

  @RequirePermission("owner", "admin")
  @Post("accounts")
  createAccount(@Body() dto: CreateFinancialAccountDto, @Req() req: Request) {
    return this.financeService.createAccount(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @RequirePermission("owner", "admin")
  @Patch("accounts/:id")
  updateAccount(@Param("id") id: string, @Body() dto: UpdateFinancialAccountDto, @Req() req: Request) {
    return this.financeService.updateAccount(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }

  @RequirePermission("owner", "admin")
  @Delete("accounts/:id")
  removeAccount(@Param("id") id: string, @Req() req: Request) {
    return this.financeService.removeAccount(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
    );
  }

  // Charges
  @Get("charges")
  findAllCharges(@Query() query: ChargesQueryDto) {
    return this.financeService.findAllCharges(this.tenancyService.getOrganizationId(), query);
  }

  // Must come before "charges/:id" — otherwise "overdue" would be parsed as an :id.
  @Get("charges/overdue")
  getOverdueCharges() {
    return this.financeService.getOverdueCharges(this.tenancyService.getOrganizationId());
  }

  @Get("summary")
  getPaymentSummary() {
    return this.financeService.getPaymentSummary(this.tenancyService.getOrganizationId());
  }

  @Get("charges/:id")
  findOneCharge(@Param("id") id: string) {
    return this.financeService.findOneCharge(this.tenancyService.getOrganizationId(), id);
  }

  // Charge creation is a receptionist-only action — owner/admin get
  // read-only finance data (see FinancePage.tsx, which hides "Add Charge"
  // for them). 403 for owner/admin here is intentional, not a gap.
  @RequirePermission("reception")
  @Post("charges")
  createCharge(@Body() dto: CreateChargeDto, @Req() req: Request) {
    return this.financeService.createCharge(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @RequirePermission("owner", "admin")
  @Patch("charges/:id")
  updateCharge(@Param("id") id: string, @Body() dto: UpdateChargeDto, @Req() req: Request) {
    return this.financeService.updateCharge(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }

  @RequirePermission("owner", "admin")
  @Delete("charges/:id")
  removeCharge(@Param("id") id: string, @Req() req: Request) {
    return this.financeService.removeCharge(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
    );
  }

  // Payments
  @Get("payments")
  findAllPayments(@Query("periodStart") periodStart?: string, @Query("periodEnd") periodEnd?: string) {
    return this.financeService.findAllPayments(this.tenancyService.getOrganizationId(), { periodStart, periodEnd });
  }

  // Must come before "payments/:id" — otherwise "stats"/"today" would be parsed as an :id.
  @Get("payments/stats")
  getDashboardStats() {
    return this.financeService.getDashboardStats(this.tenancyService.getOrganizationId());
  }

  @Get("payments/today")
  getTodayReport() {
    return this.financeService.getTodayReport(this.tenancyService.getOrganizationId());
  }

  @Get("payments/:id")
  findOnePayment(@Param("id") id: string) {
    return this.financeService.findOnePayment(this.tenancyService.getOrganizationId(), id);
  }

  // Recording a payment (including the "Mark Paid" flow, which posts here
  // with a chargeId) is receptionist-only — owner/admin see finance data as
  // read-only and must get 403 if they try to call this directly.
  @RequirePermission("reception")
  @Post("payments")
  createPayment(@Body() dto: CreatePaymentDto, @Req() req: Request) {
    return this.financeService.createPayment(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @RequirePermission("owner", "admin")
  @Patch("payments/:id")
  updatePayment(@Param("id") id: string, @Body() dto: UpdatePaymentDto, @Req() req: Request) {
    return this.financeService.updatePayment(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }

  @RequirePermission("owner", "admin")
  @Delete("payments/:id")
  removePayment(@Param("id") id: string, @Req() req: Request) {
    return this.financeService.removePayment(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
    );
  }

  // Transactions (read-only, append-only ledger)
  @Get("transactions")
  findAllTransactions() {
    return this.financeService.findAllTransactions(this.tenancyService.getOrganizationId());
  }
}
