import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateGroupDto } from "./dto/create-group.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { AssignTeacherDto } from "./dto/assign-teacher.dto";
import { EnrollStudentDto } from "./dto/enroll-student.dto";

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async withDerivedFields<T extends { id: string; courseId: string }>(
    organizationId: string,
    groups: T[],
  ) {
    const groupIds = groups.map((g) => g.id);
    const courseIds = [...new Set(groups.map((g) => g.courseId))];

    const [courses, teacherCounts, studentCounts] = await Promise.all([
      this.prisma.course.findMany({ where: { id: { in: courseIds } } }),
      this.prisma.groupTeacherAssignment.groupBy({
        by: ["groupId"],
        where: { organizationId, groupId: { in: groupIds }, status: "active" },
        _count: { groupId: true },
      }),
      this.prisma.groupMembership.groupBy({
        by: ["groupId"],
        where: { organizationId, groupId: { in: groupIds }, status: "active" },
        _count: { groupId: true },
      }),
    ]);

    const courseById = new Map(courses.map((c) => [c.id, c]));
    const teacherCountByGroup = new Map(teacherCounts.map((row) => [row.groupId, row._count.groupId]));
    const studentCountByGroup = new Map(studentCounts.map((row) => [row.groupId, row._count.groupId]));

    return groups.map((group) => ({
      ...group,
      course: courseById.get(group.courseId) ?? null,
      teacherCount: teacherCountByGroup.get(group.id) ?? 0,
      studentCount: studentCountByGroup.get(group.id) ?? 0,
    }));
  }

  async findAll(organizationId: string) {
    const groups = await this.prisma.group.findMany({
      where: { organizationId },
      include: { branch: true },
      orderBy: { createdAt: "desc" },
    });
    return this.withDerivedFields(organizationId, groups);
  }

  async findOne(organizationId: string, id: string) {
    const group = await this.prisma.group.findFirst({
      where: { id, organizationId },
      include: { branch: true },
    });
    if (!group) {
      throw new NotFoundException("Group not found");
    }
    const [withFields] = await this.withDerivedFields(organizationId, [group]);
    return withFields;
  }

  async create(organizationId: string, actorId: string, dto: CreateGroupDto) {
    const { startDate, endDate, ...rest } = dto;

    const group = await this.prisma.group.create({
      data: {
        ...rest,
        organizationId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      include: { branch: true },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "group.created",
      entityType: "Group",
      entityId: group.id,
      afterValue: group as unknown as Prisma.InputJsonValue,
    });

    return group;
  }

  async update(organizationId: string, actorId: string, id: string, dto: UpdateGroupDto) {
    const existing = await this.prisma.group.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Group not found");
    }

    const { startDate, endDate, ...rest } = dto;

    const group = await this.prisma.group.update({
      where: { id },
      data: {
        ...rest,
        startDate: startDate === undefined ? undefined : startDate === null ? null : new Date(startDate),
        endDate: endDate === undefined ? undefined : endDate === null ? null : new Date(endDate),
      },
      include: { branch: true },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "group.updated",
      entityType: "Group",
      entityId: group.id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
      afterValue: group as unknown as Prisma.InputJsonValue,
    });

    return group;
  }

  async remove(organizationId: string, actorId: string, id: string) {
    const existing = await this.prisma.group.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Group not found");
    }

    await this.prisma.group.delete({ where: { id } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "group.deleted",
      entityType: "Group",
      entityId: id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
    });

    return { id };
  }

  // ---- Teacher assignments ----

  async listTeacherAssignments(organizationId: string, groupId: string) {
    await this.findOne(organizationId, groupId);
    const assignments = await this.prisma.groupTeacherAssignment.findMany({
      where: { organizationId, groupId },
      orderBy: { createdAt: "desc" },
    });
    const teacherIds = [...new Set(assignments.map((a) => a.teacherId))];
    const teachers = await this.prisma.teacher.findMany({ where: { id: { in: teacherIds } } });
    const teacherById = new Map(teachers.map((t) => [t.id, t]));
    return assignments.map((a) => ({ ...a, teacher: teacherById.get(a.teacherId) ?? null }));
  }

  async assignTeacher(organizationId: string, actorId: string, groupId: string, dto: AssignTeacherDto) {
    const group = await this.findOne(organizationId, groupId);

    const assignment = await this.prisma.groupTeacherAssignment.create({
      data: {
        organizationId,
        branchId: group.branchId,
        groupId,
        teacherId: dto.teacherId,
        assignmentRole: dto.assignmentRole ?? "primary",
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        status: "active",
        assignedBy: actorId,
      },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "group.teacher_assigned",
      entityType: "Group",
      entityId: groupId,
      afterValue: assignment as unknown as Prisma.InputJsonValue,
    });

    return assignment;
  }

  async endTeacherAssignment(organizationId: string, actorId: string, groupId: string, assignmentId: string) {
    const existing = await this.prisma.groupTeacherAssignment.findFirst({
      where: { id: assignmentId, organizationId, groupId },
    });
    if (!existing) {
      throw new NotFoundException("Assignment not found");
    }

    const assignment = await this.prisma.groupTeacherAssignment.update({
      where: { id: assignmentId },
      data: { status: "ended", endDate: new Date() },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "group.teacher_assignment_ended",
      entityType: "Group",
      entityId: groupId,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
      afterValue: assignment as unknown as Prisma.InputJsonValue,
    });

    return assignment;
  }

  // ---- Student memberships ----

  async listMemberships(organizationId: string, groupId: string) {
    await this.findOne(organizationId, groupId);
    const memberships = await this.prisma.groupMembership.findMany({
      where: { organizationId, groupId },
      orderBy: { createdAt: "desc" },
    });
    const studentIds = [...new Set(memberships.map((m) => m.studentId))];
    const students = await this.prisma.student.findMany({ where: { id: { in: studentIds } } });
    const studentById = new Map(students.map((s) => [s.id, s]));
    return memberships.map((m) => ({ ...m, student: studentById.get(m.studentId) ?? null }));
  }

  async enrollStudent(organizationId: string, actorId: string, groupId: string, dto: EnrollStudentDto) {
    await this.findOne(organizationId, groupId);

    const membership = await this.prisma.groupMembership.create({
      data: {
        organizationId,
        groupId,
        studentId: dto.studentId,
        enrolledAt: dto.enrolledAt ? new Date(dto.enrolledAt) : new Date(),
        status: "active",
      },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "group.student_enrolled",
      entityType: "Group",
      entityId: groupId,
      afterValue: membership as unknown as Prisma.InputJsonValue,
    });

    return membership;
  }

  async removeMembership(organizationId: string, actorId: string, groupId: string, membershipId: string) {
    const existing = await this.prisma.groupMembership.findFirst({
      where: { id: membershipId, organizationId, groupId },
    });
    if (!existing) {
      throw new NotFoundException("Membership not found");
    }

    const membership = await this.prisma.groupMembership.update({
      where: { id: membershipId },
      data: { status: "dropped" },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "group.student_removed",
      entityType: "Group",
      entityId: groupId,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
      afterValue: membership as unknown as Prisma.InputJsonValue,
    });

    return membership;
  }
}
