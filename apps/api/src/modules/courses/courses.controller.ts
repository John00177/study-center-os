import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import type { CourseCategory } from "@prisma/client";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CoursesService } from "./courses.service";
import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";

@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
@Controller("courses")
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly tenancyService: TenancyService,
  ) {}

  @Get()
  findAll() {
    return this.coursesService.findAll(this.tenancyService.getOrganizationId());
  }

  // Must come before ":id" — otherwise "by-category" would be parsed as an :id.
  @Get("by-category")
  findByCategory(@Query("category") category: CourseCategory) {
    return this.coursesService.findByCategory(this.tenancyService.getOrganizationId(), category);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.coursesService.findOne(this.tenancyService.getOrganizationId(), id);
  }

  // Reception handles course/pricing setup as part of registering students —
  // full CRUD here, unlike Teachers where they stay read-only.
  @RequirePermission("owner", "admin", "reception")
  @Post()
  create(@Body() dto: CreateCourseDto, @Req() req: Request) {
    return this.coursesService.create(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @RequirePermission("owner", "admin", "reception")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCourseDto, @Req() req: Request) {
    return this.coursesService.update(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
      dto,
    );
  }

  @RequirePermission("owner", "admin", "reception")
  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.coursesService.remove(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      id,
    );
  }
}
