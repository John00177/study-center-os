import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { BulkMarkAttendanceDto } from "./dto/bulk-mark-attendance.dto";

function toDateOnly(dateInput: string): Date {
  // Attendance is one record per calendar day, so normalize to UTC midnight —
  // this is what the (groupId, studentId, date) unique constraint relies on.
  const date = new Date(dateInput);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async withStudents<T extends { studentId: string }>(records: T[]) {
    const studentIds = [...new Set(records.map((r) => r.studentId))];
    const students = await this.prisma.student.findMany({ where: { id: { in: studentIds } } });
    const studentById = new Map(students.map((s) => [s.id, s]));
    return records.map((record) => ({ ...record, student: studentById.get(record.studentId) ?? null }));
  }

  async bulkMark(organizationId: string, actorId: string, dto: BulkMarkAttendanceDto) {
    const group = await this.prisma.group.findFirst({
      where: { id: dto.groupId, organizationId },
    });
    if (!group) {
      throw new NotFoundException("Group not found");
    }

    const date = toDateOnly(dto.date);

    const records = await this.prisma.$transaction(
      dto.records.map((record) =>
        this.prisma.attendance.upsert({
          where: {
            groupId_studentId_date: { groupId: dto.groupId, studentId: record.studentId, date },
          },
          update: { status: record.status, notes: record.notes ?? null },
          create: {
            organizationId,
            branchId: group.branchId,
            groupId: dto.groupId,
            studentId: record.studentId,
            date,
            status: record.status,
            notes: record.notes ?? null,
          },
        }),
      ),
    );

    await this.auditService.record({
      organizationId,
      actorId,
      action: "attendance.bulk_marked",
      entityType: "Group",
      entityId: dto.groupId,
      afterValue: {
        date: date.toISOString(),
        count: records.length,
      } as unknown as Prisma.InputJsonValue,
    });

    const withStudents = await this.withStudents(records);
    for (const record of withStudents) {
      if (record.status === "absent" && record.student) {
        this.notificationsService.notify(
          record.student.name,
          "Attendance update",
          `${record.student.name} was marked absent today.`,
        );
      }
    }

    const absentCount = withStudents.filter((r) => r.status === "absent").length;
    if (absentCount > 0) {
      await this.notificationsService.notifyOrgStaff(organizationId, actorId, ["owner", "manager"], {
        title: "Absences recorded",
        message: `${absentCount} student${absentCount > 1 ? "s" : ""} absent in ${group.name} today`,
        type: "warning",
        entityType: "attendance",
        entityId: dto.groupId,
      });
    }

    return withStudents;
  }

  async findForGroupAndDate(organizationId: string, groupId: string, dateInput: string) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, organizationId } });
    if (!group) {
      throw new NotFoundException("Group not found");
    }

    const date = toDateOnly(dateInput);

    const records = await this.prisma.attendance.findMany({
      where: { organizationId, groupId, date },
      orderBy: { createdAt: "asc" },
    });

    return this.withStudents(records);
  }

  async findForStudent(organizationId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, organizationId } });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const records = await this.prisma.attendance.findMany({
      where: { organizationId, studentId },
      orderBy: { date: "desc" },
    });

    const groupIds = [...new Set(records.map((r) => r.groupId))];
    const groups = await this.prisma.group.findMany({ where: { id: { in: groupIds } } });
    const groupById = new Map(groups.map((g) => [g.id, g]));

    return records.map((record) => ({
      ...record,
      student,
      group: groupById.get(record.groupId) ?? null,
    }));
  }
}
