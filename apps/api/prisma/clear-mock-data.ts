import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * One-off production reset: wipes every seeded demo record (students,
 * teachers, groups, payments, charges, attendance, salaries, notifications,
 * audit logs, support tickets, ...) while preserving the structural rows an
 * org needs to keep functioning — Organization, Branch, Course, Role — and
 * every owner / platform-admin User account.
 *
 * Deletes run leaf-to-root so foreign keys never block a step. Run with:
 *   cd apps/api && npx ts-node prisma/clear-mock-data.ts
 */
async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true, slug: true } });
  const orgIds = orgs.map((o) => o.id);
  console.log(`Found ${orgs.length} organization(s): ${orgs.map((o) => o.slug).join(", ")}`);

  const where = { organizationId: { in: orgIds } };

  const counts: Record<string, number> = {};
  async function del(label: string, fn: () => Promise<{ count: number }>) {
    const { count } = await fn();
    counts[label] = count;
  }

  // ---- leaf-first deletes ----
  await del("testSubmission", () => prisma.testSubmission.deleteMany({ where }));
  await del("question", () => prisma.question.deleteMany({ where: { test: { organizationId: { in: orgIds } } } }));
  await del("test", () => prisma.test.deleteMany({ where }));
  await del("homeworkSubmission", () => prisma.homeworkSubmission.deleteMany({ where }));
  await del("homework", () => prisma.homework.deleteMany({ where }));
  await del("lesson", () => prisma.lesson.deleteMany({ where }));
  await del("attendance", () => prisma.attendance.deleteMany({ where }));
  await del("reminder", () => prisma.reminder.deleteMany({ where }));
  await del("financialTransaction", () => prisma.financialTransaction.deleteMany({ where }));
  await del("salaryPayment", () => prisma.salaryPayment.deleteMany({ where: { teacherSalary: { organizationId: { in: orgIds } } } }));
  await del("teacherSalary", () => prisma.teacherSalary.deleteMany({ where }));
  await del("payment", () => prisma.payment.deleteMany({ where }));
  await del("charge", () => prisma.charge.deleteMany({ where }));
  await del("financialAccount", () => prisma.financialAccount.deleteMany({ where }));
  await del("groupMembership", () => prisma.groupMembership.deleteMany({ where }));
  await del("groupTeacherAssignment", () => prisma.groupTeacherAssignment.deleteMany({ where }));
  await del("schedule", () => prisma.schedule.deleteMany({ where }));
  await del("teacherDashboardAccess", () => prisma.teacherDashboardAccess.deleteMany({ where }));
  await del("staffBranchAssignment", () => prisma.staffBranchAssignment.deleteMany({ where }));
  await del("group", () => prisma.group.deleteMany({ where }));
  await del("student", () => prisma.student.deleteMany({ where }));
  await del("parent", () => prisma.parent.deleteMany({ where }));
  await del("teacher", () => prisma.teacher.deleteMany({ where }));
  await del("supportTicket", () => prisma.supportTicket.deleteMany({}));
  await del("notification", () => prisma.notification.deleteMany({}));
  await del("auditLog", () => prisma.auditLog.deleteMany({ where }));

  // ---- staff users: keep owners + platform admins, drop everyone else ----
  const memberships = await prisma.userOrganizationRole.findMany({
    where: { organizationId: { in: orgIds } },
    include: { role: true },
  });
  const nonOwnerUserIds = [...new Set(memberships.filter((m) => m.role.slug !== "owner").map((m) => m.userId))];

  const deletableUserIds = nonOwnerUserIds.length
    ? (
        await prisma.user.findMany({
          where: { id: { in: nonOwnerUserIds }, isPlatformAdmin: false },
          select: { id: true },
        })
      ).map((u) => u.id)
    : [];

  await del("userOrganizationRole(non-owner)", () =>
    prisma.userOrganizationRole.deleteMany({ where: { organizationId: { in: orgIds }, userId: { in: deletableUserIds } } }),
  );
  await del("user(staff)", () => prisma.user.deleteMany({ where: { id: { in: deletableUserIds } } }));

  console.log("\nDeleted rows:");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);

  const remainingUsers = await prisma.user.findMany({ select: { email: true, isPlatformAdmin: true } });
  console.log("\nRemaining users (owners + platform admins):");
  remainingUsers.forEach((u) => console.log(`  ${u.email}${u.isPlatformAdmin ? " (platform admin)" : ""}`));

  const remainingCourses = await prisma.course.count({ where });
  const remainingBranches = await prisma.branch.count({ where });
  console.log(`\nKept: ${orgs.length} organization(s), ${remainingBranches} branch(es), ${remainingCourses} course(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
