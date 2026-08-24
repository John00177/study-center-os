import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CourseCategory, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { slugify } from "../../common/utils/slugify";
import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * A course's group/student counts aren't stored on the Course itself, so
   * they're resolved via Group -> GroupMembership (same manual-join pattern
   * used elsewhere in this codebase, e.g. GroupsService.withDerivedFields).
   */
  private async withCounts<T extends { id: string }>(organizationId: string, courses: T[]) {
    const courseIds = courses.map((c) => c.id);
    const groups = courseIds.length
      ? await this.prisma.group.findMany({
          where: { organizationId, courseId: { in: courseIds } },
          select: { id: true, courseId: true },
        })
      : [];
    const groupIds = groups.map((g) => g.id);
    const membershipCounts = groupIds.length
      ? await this.prisma.groupMembership.groupBy({
          by: ["groupId"],
          where: { organizationId, groupId: { in: groupIds }, status: "active" },
          _count: { groupId: true },
        })
      : [];
    const studentCountByGroup = new Map(membershipCounts.map((row) => [row.groupId, row._count.groupId]));

    const groupCountByCourse = new Map<string, number>();
    const studentCountByCourse = new Map<string, number>();
    for (const group of groups) {
      groupCountByCourse.set(group.courseId, (groupCountByCourse.get(group.courseId) ?? 0) + 1);
      studentCountByCourse.set(
        group.courseId,
        (studentCountByCourse.get(group.courseId) ?? 0) + (studentCountByGroup.get(group.id) ?? 0),
      );
    }

    return courses.map((course) => ({
      ...course,
      groupCount: groupCountByCourse.get(course.id) ?? 0,
      studentCount: studentCountByCourse.get(course.id) ?? 0,
    }));
  }

  private async withGroupsList(organizationId: string, courseId: string) {
    const groups = await this.prisma.group.findMany({
      where: { organizationId, courseId },
      include: { branch: true },
      orderBy: { createdAt: "desc" },
    });
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      status: g.status,
      branchName: g.branch?.name ?? null,
    }));
  }

  async findAll(organizationId: string) {
    const courses = await this.prisma.course.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return this.withCounts(organizationId, courses);
  }

  async findByCategory(organizationId: string, category: CourseCategory) {
    const courses = await this.prisma.course.findMany({
      where: { organizationId, category },
      orderBy: { createdAt: "desc" },
    });
    return this.withCounts(organizationId, courses);
  }

  async findOne(organizationId: string, id: string) {
    const course = await this.prisma.course.findFirst({ where: { id, organizationId } });
    if (!course) {
      throw new NotFoundException("Course not found");
    }
    const [withCounts] = await this.withCounts(organizationId, [course]);
    const groups = await this.withGroupsList(organizationId, id);
    return { ...withCounts, groups };
  }

  private async uniqueSlug(organizationId: string, name: string): Promise<string> {
    const base = slugify(name) || "course";
    let candidate = base;
    let suffix = 1;
    while (await this.prisma.course.findUnique({ where: { organizationId_slug: { organizationId, slug: candidate } } })) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  async create(organizationId: string, actorId: string, dto: CreateCourseDto) {
    const slug = await this.uniqueSlug(organizationId, dto.name);

    const course = await this.prisma.course.create({
      data: { ...dto, organizationId, slug },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "course.created",
      entityType: "Course",
      entityId: course.id,
      afterValue: course as unknown as Prisma.InputJsonValue,
    });

    return course;
  }

  async update(organizationId: string, actorId: string, id: string, dto: UpdateCourseDto) {
    const existing = await this.findOne(organizationId, id);

    const course = await this.prisma.course.update({ where: { id }, data: dto });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "course.updated",
      entityType: "Course",
      entityId: course.id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
      afterValue: course as unknown as Prisma.InputJsonValue,
    });

    return course;
  }

  async remove(organizationId: string, actorId: string, id: string) {
    const existing = await this.findOne(organizationId, id);

    const activeGroupCount = await this.prisma.group.count({
      where: { organizationId, courseId: id, status: "active" },
    });
    if (activeGroupCount > 0) {
      throw new ConflictException("Cannot delete a course with active groups.");
    }

    await this.prisma.course.delete({ where: { id } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "course.deleted",
      entityType: "Course",
      entityId: id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
    });

    return { id };
  }
}
