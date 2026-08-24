import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { OrganizationsService } from "./organizations.service";
import { UpdateBrandingDto } from "./dto/update-branding.dto";

const LOGO_DIR = join(process.cwd(), "uploads", "logos");
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

// This controller deliberately does NOT put guards at the class level —
// GET /organizations/branding must stay public (login pages call it before
// the visitor is authenticated), while every other route here needs a
// logged-in org member, so guards are applied per-method instead.
@Controller("organizations")
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly tenancyService: TenancyService,
  ) {}

  @Get("branding")
  getPublicBranding(@Query("slug") slug: string) {
    if (!slug) {
      throw new BadRequestException("slug query parameter is required");
    }
    return this.organizationsService.getBrandingBySlug(slug);
  }

  @UseGuards(AuthenticatedGuard, TenancyGuard)
  @Get("me/branding")
  getMyBranding() {
    return this.organizationsService.getMyBranding(this.tenancyService.getOrganizationId());
  }

  @UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
  @RequirePermission("owner", "admin")
  @Patch("me/branding")
  updateBranding(@Body() dto: UpdateBrandingDto, @Req() req: Request) {
    return this.organizationsService.updateBranding(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
  @RequirePermission("owner", "admin")
  @Post("me/logo")
  @UseInterceptors(
    FileInterceptor("logo", {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          if (!existsSync(LOGO_DIR)) {
            mkdirSync(LOGO_DIR, { recursive: true });
          }
          callback(null, LOGO_DIR);
        },
        filename: (req, file, callback) => {
          const orgSlug = (req as Request).organization?.slug ?? "org";
          const ext = extname(file.originalname) || ".png";
          callback(null, `${orgSlug}-${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_LOGO_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_LOGO_MIME_TYPES.includes(file.mimetype)) {
          callback(new BadRequestException("Logo must be a PNG, JPG, or WebP image"), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadLogo(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException("No logo file was uploaded");
    }
    const logoUrl = `/uploads/logos/${file.filename}`;
    return this.organizationsService.saveLogo(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      logoUrl,
    );
  }
}
