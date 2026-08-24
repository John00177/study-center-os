import { Prisma, PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "DemoPass123!";
const TEACHER_PASSWORD = "TeacherPass123!";
const RECEPTION_PASSWORD = "ReceptionPass123!";
const PLATFORM_ADMIN_PASSWORD = "AdminPass123!";
const ALXORAZM_OWNER_PASSWORD = "AlXorazmPass123!";
const CAMBRIDGE_OWNER_PASSWORD = "CambridgePass123!";

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function monthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

async function main() {
  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });
  const teacherPasswordHash = await argon2.hash(TEACHER_PASSWORD, { type: argon2.argon2id });
  const receptionPasswordHash = await argon2.hash(RECEPTION_PASSWORD, { type: argon2.argon2id });
  const platformAdminPasswordHash = await argon2.hash(PLATFORM_ADMIN_PASSWORD, { type: argon2.argon2id });

  const user = await prisma.user.upsert({
    where: { email: "owner@democenter.com" },
    update: { isPlatformAdmin: false },
    create: {
      email: "owner@democenter.com",
      name: "Demo Owner",
      password: passwordHash,
      status: "active",
      isPlatformAdmin: false,
    },
  });

  // The SaaS platform admin (you) — deliberately a separate account from any
  // study center owner, with no organization/UserOrganizationRole at all.
  // See PlatformAdminGuard: access is gated on isPlatformAdmin, not email.
  const platformAdmin = await prisma.user.upsert({
    where: { email: "admin@studycenter.uz" },
    update: { password: platformAdminPasswordHash, isPlatformAdmin: true },
    create: {
      email: "admin@studycenter.uz",
      name: "Platform Administrator",
      password: platformAdminPasswordHash,
      status: "active",
      isPlatformAdmin: true,
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: "demo-center" },
    update: {
      // Was "trial" before Self-Service Signup added a "pending" status that
      // blocks login — bump the demo org to "active" so the seeded owner can
      // still log in (a pre-existing org, not a fresh pending application).
      status: "active",
      ownerName: "Demo Owner",
      ownerEmail: "owner@democenter.com",
      ownerPhone: "+998901112233",
      country: "Uzbekistan",
      city: "Tashkent",
      address: "12 Amir Temur Street",
      primaryColor: "#2563eb",
      accentColor: "#22c55e",
    },
    create: {
      name: "Demo Study Center",
      slug: "demo-center",
      status: "active",
      settings: { timezone: "Asia/Tashkent", currency: "UZS", locale: "uz" },
      ownerName: "Demo Owner",
      ownerEmail: "owner@democenter.com",
      ownerPhone: "+998901112233",
      country: "Uzbekistan",
      city: "Tashkent",
      address: "12 Amir Temur Street",
      primaryColor: "#2563eb",
      accentColor: "#22c55e",
    },
  });

  const ownerRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: "owner" } },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Owner",
      slug: "owner",
      isSystem: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: "admin" } },
    update: {},
    create: { organizationId: organization.id, name: "Admin", slug: "admin", isSystem: true },
  });

  const receptionRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: "reception" } },
    update: {},
    create: { organizationId: organization.id, name: "Reception", slug: "reception", isSystem: true },
  });

  const teacherRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: "teacher" } },
    update: {},
    create: { organizationId: organization.id, name: "Teacher", slug: "teacher", isSystem: true },
  });

  await prisma.userOrganizationRole.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    update: {},
    create: {
      userId: user.id,
      organizationId: organization.id,
      roleId: ownerRole.id,
      status: "active",
      acceptedAt: new Date(),
    },
  });

  // Grant the owner, admin, and reception roles the finance.view permission
  // (see Security Rule 1: finance data is never returned without this
  // permission). Reception was added per Reports & Analytics Adjustment 3 —
  // they can view Finance and Overdue Payments, just not Analytics/revenue.
  const financeViewPermission = await prisma.permission.upsert({
    where: { slug: "finance.view" },
    update: {},
    create: { slug: "finance.view", name: "View finance data" },
  });

  for (const roleId of [ownerRole.id, adminRole.id, receptionRole.id]) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: financeViewPermission.id } },
      update: {},
      create: { roleId, permissionId: financeViewPermission.id },
    });
  }

  let branch = await prisma.branch.findFirst({
    where: { organizationId: organization.id, slug: "main" },
  });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        organizationId: organization.id,
        name: "Main Branch",
        slug: "main",
        status: "active",
        address: "123 Main St",
      },
    });
  }

  // Reception login — manages newcomers/students/groups/schedule, no finance access.
  const receptionUser = await prisma.user.upsert({
    where: { email: "reception@democenter.com" },
    update: { password: receptionPasswordHash },
    create: {
      email: "reception@democenter.com",
      name: "Demo Reception",
      password: receptionPasswordHash,
      status: "active",
    },
  });
  await prisma.userOrganizationRole.upsert({
    where: { userId_organizationId: { userId: receptionUser.id, organizationId: organization.id } },
    update: {},
    create: {
      userId: receptionUser.id,
      organizationId: organization.id,
      roleId: receptionRole.id,
      status: "active",
      acceptedAt: new Date(),
    },
  });

  // John Smith: existing teacher, now also a login-capable teacher-dashboard user.
  const johnUser = await prisma.user.upsert({
    where: { email: "john@democenter.com" },
    update: { password: teacherPasswordHash },
    create: {
      email: "john@democenter.com",
      name: "John Smith",
      password: teacherPasswordHash,
      status: "active",
    },
  });
  await prisma.userOrganizationRole.upsert({
    where: { userId_organizationId: { userId: johnUser.id, organizationId: organization.id } },
    update: {},
    create: {
      userId: johnUser.id,
      organizationId: organization.id,
      roleId: teacherRole.id,
      status: "active",
      acceptedAt: new Date(),
    },
  });

  let teacher = await prisma.teacher.findFirst({
    where: { organizationId: organization.id, email: "john@democenter.com" },
  });
  if (!teacher) {
    teacher = await prisma.teacher.create({
      data: {
        organizationId: organization.id,
        userId: johnUser.id,
        name: "John Smith",
        email: "john@democenter.com",
        phone: "+998933112233",
      },
    });
  } else if (teacher.userId !== johnUser.id || !teacher.phone) {
    teacher = await prisma.teacher.update({
      where: { id: teacher.id },
      data: { userId: johnUser.id, phone: teacher.phone ?? "+998933112233" },
    });
  }

  const johnAccess = await prisma.teacherDashboardAccess.findFirst({
    where: { organizationId: organization.id, teacherId: teacher.id },
  });
  if (!johnAccess) {
    await prisma.teacherDashboardAccess.create({
      data: {
        organizationId: organization.id,
        teacherId: teacher.id,
        status: "active",
        activatedBy: user.id,
        activatedAt: new Date(),
      },
    });
  } else if (johnAccess.status !== "active") {
    await prisma.teacherDashboardAccess.update({
      where: { id: johnAccess.id },
      data: { status: "active", activatedBy: user.id, activatedAt: new Date() },
    });
  }

  // Sarah Johnson: a second teacher with dashboard access activated, no group yet.
  let sarah = await prisma.teacher.findFirst({
    where: { organizationId: organization.id, email: "sarah@democenter.com" },
  });
  if (!sarah) {
    sarah = await prisma.teacher.create({
      data: {
        organizationId: organization.id,
        name: "Sarah Johnson",
        email: "sarah@democenter.com",
        specialization: "Mathematics",
      },
    });
  }
  const sarahAccess = await prisma.teacherDashboardAccess.findFirst({
    where: { organizationId: organization.id, teacherId: sarah.id },
  });
  if (!sarahAccess) {
    await prisma.teacherDashboardAccess.create({
      data: {
        organizationId: organization.id,
        teacherId: sarah.id,
        status: "active",
        activatedBy: user.id,
        activatedAt: new Date(),
      },
    });
  }

  // "New Teacher Test": a login-capable teacher seeded with
  // mustChangePassword=true, for exercising the first-login forced
  // password-change flow (owner-created accounts) without having to create
  // one by hand in every test run.
  const NEW_TEACHER_TEMP_PASSWORD = "Temp1234";
  const newTeacherPasswordHash = await argon2.hash(NEW_TEACHER_TEMP_PASSWORD, { type: argon2.argon2id });
  const newTeacherUser = await prisma.user.upsert({
    where: { email: "newteacher@democenter.com" },
    update: { password: newTeacherPasswordHash, mustChangePassword: true, tempPassword: NEW_TEACHER_TEMP_PASSWORD },
    create: {
      email: "newteacher@democenter.com",
      name: "New Teacher Test",
      password: newTeacherPasswordHash,
      status: "active",
      mustChangePassword: true,
      tempPassword: NEW_TEACHER_TEMP_PASSWORD,
    },
  });
  await prisma.userOrganizationRole.upsert({
    where: { userId_organizationId: { userId: newTeacherUser.id, organizationId: organization.id } },
    update: {},
    create: {
      userId: newTeacherUser.id,
      organizationId: organization.id,
      roleId: teacherRole.id,
      status: "active",
      acceptedAt: new Date(),
    },
  });
  let newTeacher = await prisma.teacher.findFirst({
    where: { organizationId: organization.id, email: "newteacher@democenter.com" },
  });
  if (!newTeacher) {
    newTeacher = await prisma.teacher.create({
      data: {
        organizationId: organization.id,
        userId: newTeacherUser.id,
        name: "New Teacher Test",
        email: "newteacher@democenter.com",
      },
    });
  } else if (newTeacher.userId !== newTeacherUser.id) {
    newTeacher = await prisma.teacher.update({ where: { id: newTeacher.id }, data: { userId: newTeacherUser.id } });
  }
  const newTeacherAccess = await prisma.teacherDashboardAccess.findFirst({
    where: { organizationId: organization.id, teacherId: newTeacher.id },
  });
  if (!newTeacherAccess) {
    await prisma.teacherDashboardAccess.create({
      data: {
        organizationId: organization.id,
        teacherId: newTeacher.id,
        status: "active",
        activatedBy: user.id,
        activatedAt: new Date(),
      },
    });
  }

  // Teacher salaries — John has an active fixed salary with August already
  // paid (so the owner salaries page and John's own dashboard both have
  // something real to show out of the box); Sarah's salary has no payment
  // recorded yet, which exercises the "pending" state.
  let johnSalary = await prisma.teacherSalary.findFirst({
    where: { organizationId: organization.id, teacherId: teacher.id, status: "active", effectiveTo: null },
  });
  if (!johnSalary) {
    johnSalary = await prisma.teacherSalary.create({
      data: {
        organizationId: organization.id,
        teacherId: teacher.id,
        amount: 3_000_000,
        currency: "UZS",
        type: "fixed",
        effectiveFrom: new Date("2026-01-01"),
        status: "active",
      },
    });
  }
  const johnAugustPayment = await prisma.salaryPayment.findUnique({
    where: { teacherSalaryId_month: { teacherSalaryId: johnSalary.id, month: "2026-08" } },
  });
  if (!johnAugustPayment) {
    await prisma.salaryPayment.create({
      data: {
        teacherSalaryId: johnSalary.id,
        organizationId: organization.id,
        amount: 3_000_000,
        currency: "UZS",
        month: "2026-08",
        status: "paid",
        paidAt: new Date("2026-08-05"),
        paymentMethod: "cash",
      },
    });
  }

  const sarahSalary = await prisma.teacherSalary.findFirst({
    where: { organizationId: organization.id, teacherId: sarah.id, status: "active", effectiveTo: null },
  });
  if (!sarahSalary) {
    await prisma.teacherSalary.create({
      data: {
        organizationId: organization.id,
        teacherId: sarah.id,
        amount: 2_500_000,
        currency: "UZS",
        type: "fixed",
        effectiveFrom: new Date("2026-01-01"),
        status: "active",
      },
    });
  }

  // Student portal login for both — separate credential space from staff
  // (see StudentsService.validateStudentCredentials): phone/email + password.
  const studentPasswordHash = await argon2.hash("Student123!", { type: argon2.argon2id });
  // Parent portal login — separate again from both staff and student
  // credentials (see StudentsService.validateParentCredentials): the parent
  // fields live on the Student row itself rather than a standalone account.
  const parentPasswordHash = await argon2.hash("Parent123!", { type: argon2.argon2id });

  let student = await prisma.student.findFirst({
    where: { organizationId: organization.id, phone: "+998901234567" },
  });
  if (!student) {
    student = await prisma.student.create({
      data: {
        organizationId: organization.id,
        name: "Alijon Karimov",
        phone: "+998901234567",
        status: "active",
        convertedAt: new Date(),
        password: studentPasswordHash,
        parentName: "Karimov Family",
        parentEmail: "parent@example.com",
        parentPhone: "+998901234567",
        parentPassword: parentPasswordHash,
      },
    });
  } else if (student.status !== "active" || !student.password || !student.parentPassword) {
    student = await prisma.student.update({
      where: { id: student.id },
      data: {
        status: "active",
        convertedAt: student.convertedAt ?? new Date(),
        password: student.password ?? studentPasswordHash,
        parentName: student.parentName ?? "Karimov Family",
        parentEmail: student.parentEmail ?? "parent@example.com",
        parentPhone: student.parentPhone ?? "+998901234567",
        parentPassword: student.parentPassword ?? parentPasswordHash,
      },
    });
  }

  // Bobur Rahimov: a newcomer, not yet converted to an active student.
  let bobur = await prisma.student.findFirst({
    where: { organizationId: organization.id, phone: "+998909998877" },
  });
  if (!bobur) {
    bobur = await prisma.student.create({
      data: {
        organizationId: organization.id,
        name: "Bobur Rahimov",
        phone: "+998909998877",
        status: "newcomer",
        interestedCourse: "Math",
        password: studentPasswordHash,
      },
    });
  } else if (!bobur.password) {
    bobur = await prisma.student.update({
      where: { id: bobur.id },
      data: { password: studentPasswordHash },
    });
  }

  let parent = await prisma.parent.findFirst({
    where: { organizationId: organization.id, phone: "+998907654321" },
  });
  if (!parent) {
    parent = await prisma.parent.create({
      data: {
        organizationId: organization.id,
        name: "Mr. Karimov",
        phone: "+998907654321",
      },
    });
  }

  let course = await prisma.course.findFirst({
    where: { organizationId: organization.id, slug: "ielts-prep" },
  });
  if (!course) {
    course = await prisma.course.create({
      data: {
        organizationId: organization.id,
        name: "IELTS Preparation",
        slug: "ielts-prep",
        level: "Intermediate",
        duration: "3 months",
        category: "preparation",
        monthlyFee: 600000,
      },
    });
  } else if (course.monthlyFee == null || course.category !== "preparation") {
    course = await prisma.course.update({
      where: { id: course.id },
      data: { monthlyFee: course.monthlyFee ?? 600000, category: "preparation" },
    });
  }

  const otherCourseSeeds = [
    {
      slug: "general-english",
      name: "General English",
      category: "language" as const,
      level: "Beginner",
      duration: "4 months",
      monthlyFee: 500000,
    },
    {
      slug: "math-fundamentals",
      name: "Mathematics Fundamentals",
      category: "mathematics" as const,
      level: "Intermediate",
      duration: "3 months",
      monthlyFee: 450000,
    },
  ];
  for (const seedCourse of otherCourseSeeds) {
    const { slug, ...seedFields } = seedCourse;
    const existingCourse = await prisma.course.findFirst({
      where: { organizationId: organization.id, slug },
    });
    if (!existingCourse) {
      await prisma.course.create({ data: { ...seedFields, slug, organizationId: organization.id } });
    } else if (existingCourse.category !== seedFields.category || existingCourse.monthlyFee == null) {
      await prisma.course.update({ where: { id: existingCourse.id }, data: seedFields });
    }
  }

  let group = await prisma.group.findFirst({
    where: { organizationId: organization.id, name: "IELTS Group A" },
  });
  if (!group) {
    group = await prisma.group.create({
      data: {
        organizationId: organization.id,
        branchId: branch.id,
        courseId: course.id,
        name: "IELTS Group A",
        status: "active",
        maxStudents: 15,
      },
    });
  }

  const existingAssignment = await prisma.groupTeacherAssignment.findFirst({
    where: { organizationId: organization.id, groupId: group.id, teacherId: teacher.id },
  });
  if (!existingAssignment) {
    await prisma.groupTeacherAssignment.create({
      data: {
        organizationId: organization.id,
        branchId: branch.id,
        groupId: group.id,
        teacherId: teacher.id,
        assignmentRole: "primary",
        startDate: new Date(),
        status: "active",
        assignedBy: user.id,
      },
    });
  }

  // Classroom + weekly schedule for IELTS Group A — without these, a fresh
  // install shows an empty schedule everywhere (teacher dashboard, calendar,
  // parent portal) since nothing else in this seed creates them.
  let classroom = await prisma.classroom.findFirst({
    where: { organizationId: organization.id, branchId: branch.id, name: "Room 101" },
  });
  if (!classroom) {
    classroom = await prisma.classroom.create({
      data: {
        organizationId: organization.id,
        branchId: branch.id,
        name: "Room 101",
        capacity: 15,
      },
    });
  }

  const existingSchedule = await prisma.schedule.findFirst({
    where: { organizationId: organization.id, groupId: group.id },
  });
  if (!existingSchedule) {
    // Mon/Wed/Fri 09:00-10:00 (dayOfWeek: 0=Sun ... 6=Sat, matching AttendanceStatus-style JS Date#getDay()).
    for (const dayOfWeek of [1, 3, 5]) {
      await prisma.schedule.create({
        data: {
          organizationId: organization.id,
          branchId: branch.id,
          groupId: group.id,
          classroomId: classroom.id,
          dayOfWeek,
          startTime: "09:00",
          endTime: "10:00",
        },
      });
    }
  }

  const existingMembership = await prisma.groupMembership.findFirst({
    where: { organizationId: organization.id, groupId: group.id, studentId: student.id },
  });
  if (!existingMembership) {
    await prisma.groupMembership.create({
      data: {
        organizationId: organization.id,
        groupId: group.id,
        studentId: student.id,
        enrolledAt: new Date(),
        status: "active",
      },
    });
  }

  const boburMembership = await prisma.groupMembership.findFirst({
    where: { organizationId: organization.id, groupId: group.id, studentId: bobur.id },
  });
  if (!boburMembership) {
    await prisma.groupMembership.create({
      data: {
        organizationId: organization.id,
        groupId: group.id,
        studentId: bobur.id,
        enrolledAt: new Date(),
        status: "active",
      },
    });
  }

  const homeworkDueDate = new Date();
  homeworkDueDate.setDate(homeworkDueDate.getDate() + 7);

  let homework = await prisma.homework.findFirst({
    where: { organizationId: organization.id, groupId: group.id, title: "Write an essay about your hometown" },
  });
  if (!homework) {
    homework = await prisma.homework.create({
      data: {
        organizationId: organization.id,
        branchId: branch.id,
        groupId: group.id,
        teacherId: teacher.id,
        title: "Write an essay about your hometown",
        description: "Minimum 250 words, use Present Perfect tense",
        dueDate: homeworkDueDate,
        status: "active",
      },
    });

    for (const homeworkStudent of [student, bobur]) {
      await prisma.homeworkSubmission.create({
        data: {
          organizationId: organization.id,
          homeworkId: homework.id,
          studentId: homeworkStudent.id,
          status: "pending",
        },
      });
    }
  }

  // AI-generated test demo: "Present Perfect Tense Quiz", published to IELTS
  // Group A, with one graded submission from Alijon (8/10) so the results
  // page and student "View Results" flow both have something to show.
  let presentPerfectQuiz = await prisma.test.findFirst({
    where: { organizationId: organization.id, teacherId: teacher.id, title: "Present Perfect Tense Quiz" },
  });
  if (!presentPerfectQuiz) {
    const mcAnswers = ["A", "B", "A", "C", "B", "A"];
    const questionInputs: Prisma.QuestionCreateWithoutTestInput[] = [
      ...Array.from({ length: 6 }, (_, i) => ({
        type: "multiple_choice",
        text: `Which sentence correctly uses the Present Perfect Tense? (Question ${i + 1})`,
        options: [
          "A. She has visited London three times.",
          "B. She visit London three times.",
          "C. She is visiting London three times yesterday.",
          "D. She visiting London three times.",
        ],
        correctAnswer: mcAnswers[i],
        marks: 1,
        explanation: "The Present Perfect Tense uses 'has/have' + past participle.",
        order: i + 1,
      })),
      {
        type: "fill_blank",
        text: "Complete the sentence: I ______ (finish) my homework already.",
        options: [],
        correctAnswer: "have finished",
        marks: 1,
        explanation: "Present Perfect: subject + have/has + past participle.",
        order: 7,
      },
      {
        type: "fill_blank",
        text: "Complete the sentence: They ______ (not see) that movie yet.",
        options: [],
        correctAnswer: "have not seen",
        marks: 1,
        explanation: "Negative Present Perfect: subject + have/has not + past participle.",
        order: 8,
      },
      {
        type: "true_false",
        text: "True or False: The Present Perfect Tense is used for actions that happened at a specific time in the past.",
        options: ["true", "false"],
        correctAnswer: "false",
        marks: 1,
        explanation: "Present Perfect is used for unspecified past time, not a specific time (that's Simple Past).",
        order: 9,
      },
      {
        type: "true_false",
        text: "True or False: 'Have you ever been to Japan?' is a correct Present Perfect question.",
        options: ["true", "false"],
        correctAnswer: "true",
        marks: 1,
        explanation: "This is a standard Present Perfect question form for life experience.",
        order: 10,
      },
    ];

    presentPerfectQuiz = await prisma.test.create({
      data: {
        organizationId: organization.id,
        teacherId: teacher.id,
        groupId: group.id,
        title: "Present Perfect Tense Quiz",
        topic: "Present Perfect Tense",
        subject: "General English",
        level: "Intermediate",
        duration: 20,
        totalMarks: 10,
        passMarks: 6,
        status: "published",
        questions: { create: questionInputs },
      },
    });
  }

  const alijonSubmission = await prisma.testSubmission.findFirst({
    where: { testId: presentPerfectQuiz.id, studentId: student.id },
  });
  if (!alijonSubmission) {
    const quizQuestions = await prisma.question.findMany({
      where: { testId: presentPerfectQuiz.id },
      orderBy: { order: "asc" },
    });
    // Alijon gets 8/10: correct on all but one multiple-choice and one true/false question.
    const answers = quizQuestions.map((q, i) => {
      const isCorrect = i !== 2 && i !== 8;
      let givenAnswer = q.correctAnswer ?? "";
      if (!isCorrect) {
        if (q.type === "true_false") {
          givenAnswer = q.correctAnswer === "true" ? "false" : "true";
        } else if (q.type === "multiple_choice") {
          givenAnswer = ["A", "B", "C", "D"].find((letter) => letter !== q.correctAnswer) ?? "A";
        }
      }
      return {
        questionId: q.id,
        answer: givenAnswer,
        isCorrect,
        marksObtained: isCorrect ? q.marks : 0,
      };
    });

    await prisma.testSubmission.create({
      data: {
        organizationId: organization.id,
        testId: presentPerfectQuiz.id,
        studentId: student.id,
        answers,
        totalScore: 8,
        percentage: 80,
        status: "graded",
        submittedAt: new Date(),
      },
    });
  }

  let financialAccount = await prisma.financialAccount.findFirst({
    where: { organizationId: organization.id, name: "Main Cash Desk" },
  });
  if (!financialAccount) {
    financialAccount = await prisma.financialAccount.create({
      data: {
        organizationId: organization.id,
        branchId: branch.id,
        name: "Main Cash Desk",
        type: "cash_desk",
      },
    });
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const existingCharge = await prisma.charge.findFirst({
    where: { organizationId: organization.id, studentId: student.id, description: "August fee" },
  });
  if (!existingCharge) {
    await prisma.charge.create({
      data: {
        organizationId: organization.id,
        branchId: branch.id,
        studentId: student.id,
        amount: 600000,
        currency: "UZS",
        description: "August fee",
        dueDate,
      },
    });
  }

  const overdueDueDate = new Date();
  overdueDueDate.setDate(overdueDueDate.getDate() - 45);

  const existingOverdueCharge = await prisma.charge.findFirst({
    where: { organizationId: organization.id, studentId: student.id, description: "July fee" },
  });
  if (!existingOverdueCharge) {
    await prisma.charge.create({
      data: {
        organizationId: organization.id,
        branchId: branch.id,
        studentId: student.id,
        amount: 500000,
        currency: "UZS",
        description: "July fee",
        dueDate: overdueDueDate,
        status: "overdue",
      },
    });
  }

  // A second charge, still pending but 15 days past its due date — this one
  // is left as status "pending" so the Finance page's computed-overdue logic
  // (pending + dueDate < now => shows as overdue) has something to prove
  // itself against, distinct from the "July fee" charge above which uses the
  // literal stored "overdue" status.
  const computedOverdueDueDate = new Date();
  computedOverdueDueDate.setDate(computedOverdueDueDate.getDate() - 15);

  const existingComputedOverdueCharge = await prisma.charge.findFirst({
    where: { organizationId: organization.id, studentId: student.id, description: "June fee" },
  });
  if (!existingComputedOverdueCharge) {
    await prisma.charge.create({
      data: {
        organizationId: organization.id,
        branchId: branch.id,
        studentId: student.id,
        amount: 600000,
        currency: "UZS",
        description: "June fee",
        dueDate: computedOverdueDueDate,
        status: "pending",
      },
    });
  }

  let payment = await prisma.payment.findFirst({
    where: { organizationId: organization.id, studentId: student.id, financialAccountId: financialAccount.id },
  });
  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        organizationId: organization.id,
        branchId: branch.id,
        studentId: student.id,
        financialAccountId: financialAccount.id,
        amount: 600000,
        currency: "UZS",
        paymentMethod: "cash",
      },
    });

    await prisma.financialTransaction.create({
      data: {
        organizationId: organization.id,
        branchId: branch.id,
        financialAccountId: financialAccount.id,
        studentId: student.id,
        type: "payment",
        direction: "credit",
        amount: payment.amount,
        currency: payment.currency,
        referenceId: payment.id,
        referenceType: "Payment",
      },
    });
  }

  // ---- Part B: Platform admin demo data (plans, subscriptions, other orgs) ----

  const starterPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: "starter" },
    update: {},
    create: { name: "Starter", slug: "starter", price: 29, currency: "USD", interval: "month" },
  });
  const growthPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: "growth" },
    update: {},
    create: { name: "Growth", slug: "growth", price: 79, currency: "USD", interval: "month" },
  });
  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: "pro" },
    update: { name: "Pro" },
    create: { name: "Pro", slug: "pro", price: 199, currency: "USD", interval: "month" },
  });
  // "enterprise" was renamed to "pro" — clean up the orphaned row from
  // earlier seed runs so it doesn't show up as a stray duplicate plan.
  await prisma.subscriptionPlan.deleteMany({ where: { slug: "enterprise" } });

  // Self-healing: re-running the seed against a DB from before subscription
  // enforcement existed (or with a stale plan) converges the org onto the
  // intended plan/status instead of silently leaving it as first-created.
  async function ensureSubscription(orgId: string, planId: string, status: string) {
    const existing = await prisma.subscription.findFirst({ where: { organizationId: orgId } });
    if (existing) {
      if (existing.planId !== planId || existing.status !== status) {
        return prisma.subscription.update({ where: { id: existing.id }, data: { planId, status } });
      }
      return existing;
    }
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    return prisma.subscription.create({
      data: {
        organizationId: orgId,
        planId,
        status,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  await ensureSubscription(organization.id, growthPlan.id, "active");

  const alXorazm = await prisma.organization.upsert({
    where: { slug: "al-xorazm" },
    update: { primaryColor: "#059669", accentColor: "#f59e0b" },
    create: {
      name: "Al-Xorazm Study Center",
      slug: "al-xorazm",
      status: "trial",
      settings: { timezone: "Asia/Tashkent", currency: "UZS", locale: "uz" },
      ownerEmail: "owner@alxorazm.uz",
      ownerPhone: "+998911234567",
      country: "Uzbekistan",
      city: "Urgench",
      address: "45 Xorazm Avenue",
      primaryColor: "#059669",
      accentColor: "#f59e0b",
    },
  });
  await ensureSubscription(alXorazm.id, starterPlan.id, "trialing");

  // Al-Xorazm's own login-capable owner (Roles are org-scoped, so this can't
  // reuse the demo org's ownerRole) — needed to exercise subscription
  // enforcement end-to-end: log in, hit the Starter limits, see the banners.
  const alXorazmOwnerRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: alXorazm.id, slug: "owner" } },
    update: {},
    create: { organizationId: alXorazm.id, name: "Owner", slug: "owner", isSystem: true },
  });
  const alXorazmOwnerPasswordHash = await argon2.hash(ALXORAZM_OWNER_PASSWORD, { type: argon2.argon2id });
  const alXorazmOwnerUser = await prisma.user.upsert({
    where: { email: "owner@alxorazm.uz" },
    update: { password: alXorazmOwnerPasswordHash },
    create: {
      email: "owner@alxorazm.uz",
      name: "Alisher Nazarov",
      password: alXorazmOwnerPasswordHash,
      status: "active",
    },
  });
  await prisma.userOrganizationRole.upsert({
    where: { userId_organizationId: { userId: alXorazmOwnerUser.id, organizationId: alXorazm.id } },
    update: {},
    create: {
      userId: alXorazmOwnerUser.id,
      organizationId: alXorazm.id,
      roleId: alXorazmOwnerRole.id,
      status: "active",
      acceptedAt: new Date(),
    },
  });
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: alXorazmOwnerRole.id, permissionId: financeViewPermission.id } },
    update: {},
    create: { roleId: alXorazmOwnerRole.id, permissionId: financeViewPermission.id },
  });

  let alXorazmBranch = await prisma.branch.findFirst({ where: { organizationId: alXorazm.id, slug: "main" } });
  if (!alXorazmBranch) {
    alXorazmBranch = await prisma.branch.create({
      data: {
        organizationId: alXorazm.id,
        name: "Main Branch",
        slug: "main",
        status: "active",
        address: "45 Xorazm Avenue",
      },
    });
  }

  // 3 teachers with active dashboard access — right at the Starter plan's
  // teacher limit (see subscription-limits.service.ts).
  const alXorazmTeacherNames = ["Dilnoza Yusupova", "Farrux Tashkentov", "Gulnora Islomova"];
  for (const name of alXorazmTeacherNames) {
    let t = await prisma.teacher.findFirst({ where: { organizationId: alXorazm.id, name } });
    if (!t) {
      t = await prisma.teacher.create({ data: { organizationId: alXorazm.id, name } });
    }
    const access = await prisma.teacherDashboardAccess.findFirst({
      where: { organizationId: alXorazm.id, teacherId: t.id },
    });
    if (!access) {
      await prisma.teacherDashboardAccess.create({
        data: { organizationId: alXorazm.id, teacherId: t.id, status: "active" },
      });
    } else if (access.status !== "active") {
      await prisma.teacherDashboardAccess.update({ where: { id: access.id }, data: { status: "active" } });
    }
  }

  // 75 active students — 5 below the Starter plan's 80-student cap, so the
  // dashboard's limit-warning banner is live (>=90%) without the org already
  // being blocked from every other seed run.
  const AL_XORAZM_STUDENT_COUNT = 75;
  const existingAlXorazmStudents = await prisma.student.count({
    where: { organizationId: alXorazm.id, status: "active" },
  });
  for (let i = existingAlXorazmStudents; i < AL_XORAZM_STUDENT_COUNT; i++) {
    await prisma.student.create({
      data: {
        organizationId: alXorazm.id,
        name: `Al-Xorazm Student ${i + 1}`,
        status: "active",
        registeredAt: new Date(),
        convertedAt: new Date(),
      },
    });
  }

  const cambridgeTashkent = await prisma.organization.upsert({
    where: { slug: "cambridge-tashkent" },
    update: { primaryColor: "#7c3aed", accentColor: "#ec4899" },
    create: {
      name: "Cambridge Center Tashkent",
      slug: "cambridge-tashkent",
      status: "active",
      settings: { timezone: "Asia/Tashkent", currency: "UZS", locale: "uz" },
      ownerEmail: "owner@cambridge-tashkent.uz",
      ownerPhone: "+998933456789",
      country: "Uzbekistan",
      city: "Tashkent",
      address: "8 Mustaqillik Square",
      primaryColor: "#7c3aed",
      accentColor: "#ec4899",
    },
  });
  await ensureSubscription(cambridgeTashkent.id, proPlan.id, "active");

  const cambridgeOwnerRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: cambridgeTashkent.id, slug: "owner" } },
    update: {},
    create: { organizationId: cambridgeTashkent.id, name: "Owner", slug: "owner", isSystem: true },
  });
  const cambridgeOwnerPasswordHash = await argon2.hash(CAMBRIDGE_OWNER_PASSWORD, { type: argon2.argon2id });
  const cambridgeOwnerUser = await prisma.user.upsert({
    where: { email: "owner@cambridge-tashkent.uz" },
    update: { password: cambridgeOwnerPasswordHash },
    create: {
      email: "owner@cambridge-tashkent.uz",
      name: "Elena Petrova",
      password: cambridgeOwnerPasswordHash,
      status: "active",
    },
  });
  await prisma.userOrganizationRole.upsert({
    where: { userId_organizationId: { userId: cambridgeOwnerUser.id, organizationId: cambridgeTashkent.id } },
    update: {},
    create: {
      userId: cambridgeOwnerUser.id,
      organizationId: cambridgeTashkent.id,
      roleId: cambridgeOwnerRole.id,
      status: "active",
      acceptedAt: new Date(),
    },
  });
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: cambridgeOwnerRole.id, permissionId: financeViewPermission.id } },
    update: {},
    create: { roleId: cambridgeOwnerRole.id, permissionId: financeViewPermission.id },
  });

  // A few platform payments (SaaS subscription revenue collected from study
  // centers) spread across recent months, so the platform-admin revenue
  // charts have more than a single data point.
  const platformInvoiceSeeds = [
    { org: organization, plan: growthPlan, monthsAgoOffset: 2 },
    { org: organization, plan: growthPlan, monthsAgoOffset: 1 },
    { org: organization, plan: growthPlan, monthsAgoOffset: 0 },
    { org: cambridgeTashkent, plan: proPlan, monthsAgoOffset: 1 },
    { org: cambridgeTashkent, plan: proPlan, monthsAgoOffset: 0 },
  ];
  for (const seedRow of platformInvoiceSeeds) {
    const createdAt = new Date();
    createdAt.setMonth(createdAt.getMonth() - seedRow.monthsAgoOffset);

    const existingInvoice = await prisma.platformInvoice.findFirst({
      where: { organizationId: seedRow.org.id, amount: seedRow.plan.price, createdAt: { gte: monthStart(createdAt), lte: monthEnd(createdAt) } },
    });
    if (existingInvoice) continue;

    const invoice = await prisma.platformInvoice.create({
      data: {
        organizationId: seedRow.org.id,
        subscriptionId: (await prisma.subscription.findFirstOrThrow({ where: { organizationId: seedRow.org.id } })).id,
        amount: seedRow.plan.price,
        currency: "USD",
        status: "paid",
        dueDate: createdAt,
        paidAt: createdAt,
        createdAt,
      },
    });
    await prisma.platformPayment.create({
      data: {
        organizationId: seedRow.org.id,
        invoiceId: invoice.id,
        amount: seedRow.plan.price,
        currency: "USD",
        paymentMethod: "card",
        status: "succeeded",
        createdAt,
      },
    });
  }

  // Demo support tickets — one per submitter role so both the platform admin
  // dashboard and the owner's org-scoped view have data on a fresh seed.
  const demoTickets = [
    {
      type: "issue" as const,
      title: "Payment reminder SMS not sending",
      description:
        "We enabled payment reminders last week but no SMS messages are reaching students with overdue balances. The reminder history page shows them as queued but nothing is delivered.",
      priority: "high" as const,
      status: "open" as const,
      submitterType: "owner",
      submitterId: user.id,
      submitterName: user.name,
      contactName: user.name,
      contactEmail: user.email,
    },
    {
      type: "idea" as const,
      title: "Add dark mode for teachers",
      description:
        "Many of us teach evening classes and the bright dashboard is hard on the eyes. A dark theme toggle in the teacher portal would be a big quality-of-life improvement.",
      priority: "low" as const,
      status: "open" as const,
      submitterType: "teacher",
      submitterId: johnUser.id,
      submitterName: johnUser.name,
      contactName: johnUser.name,
      contactEmail: johnUser.email,
    },
    {
      type: "question" as const,
      title: "How do I export attendance?",
      description:
        "A parent asked for a printed attendance record for their child this term. I can see the attendance page but I cannot find any way to export or print it. Is that possible?",
      priority: "medium" as const,
      status: "in_progress" as const,
      submitterType: "reception",
      submitterId: receptionUser.id,
      submitterName: receptionUser.name,
      contactName: receptionUser.name,
      contactEmail: receptionUser.email,
    },
  ];

  for (const ticket of demoTickets) {
    const existing = await prisma.supportTicket.findFirst({
      where: { organizationId: organization.id, title: ticket.title },
    });
    if (!existing) {
      await prisma.supportTicket.create({ data: { ...ticket, organizationId: organization.id } });
    }
  }

  console.log("Seed complete.", {
    org: organization.slug,
    owner: `${user.email} / ${DEMO_PASSWORD}`,
    reception: `${receptionUser.email} / ${RECEPTION_PASSWORD}`,
    teacher: `${johnUser.email} / ${TEACHER_PASSWORD}`,
    platformAdmin: `${platformAdmin.email} / ${PLATFORM_ADMIN_PASSWORD}`,
    newcomer: bobur.name,
    parent: parent.name,
    alXorazmOwner: `${alXorazmOwnerUser.email} / ${ALXORAZM_OWNER_PASSWORD} (Starter, ${AL_XORAZM_STUDENT_COUNT}/80 students)`,
    cambridgeOwner: `${cambridgeOwnerUser.email} / ${CAMBRIDGE_OWNER_PASSWORD} (Pro)`,
    newTeacher: `${newTeacherUser.email} / ${NEW_TEACHER_TEMP_PASSWORD} (must change password on first login)`,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
