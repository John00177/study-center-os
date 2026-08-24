import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { GenerateTestDto } from "./dto/generate-test.dto";
import { CreateTestDto } from "./dto/create-test.dto";
import { UpdateTestDto } from "./dto/update-test.dto";
import { GradeEssayDto } from "./dto/grade-essay.dto";
import { generateMockTest } from "./mock-test-generator";

export interface TestFilters {
  status?: string;
  subject?: string;
  search?: string;
}

interface StoredAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean | null;
  marksObtained: number;
}

@Injectable()
export class AiTestGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  /** Pure preview — nothing is persisted until the teacher clicks Save. */
  generateTest(dto: GenerateTestDto) {
    const language = dto.language ?? "uz";
    const generated = generateMockTest({ ...dto, language });
    return {
      ...generated,
      topic: dto.topic,
      subject: dto.subject,
      level: dto.level,
      duration: dto.duration,
      language,
    };
  }

  private async assertGroupBelongsToTeacher(organizationId: string, teacherId: string, groupId: string) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, organizationId } });
    if (!group) {
      throw new NotFoundException("Group not found");
    }
    const assignment = await this.prisma.groupTeacherAssignment.findFirst({
      where: { organizationId, groupId, teacherId, status: "active" },
    });
    if (!assignment) {
      throw new ForbiddenException("You are not assigned to this group");
    }
    return group;
  }

  async saveTest(organizationId: string, teacherId: string, dto: CreateTestDto) {
    if (dto.groupId) {
      await this.assertGroupBelongsToTeacher(organizationId, teacherId, dto.groupId);
    }

    return this.prisma.test.create({
      data: {
        organizationId,
        teacherId,
        title: dto.title,
        topic: dto.topic,
        subject: dto.subject,
        level: dto.level,
        duration: dto.duration,
        totalMarks: dto.totalMarks,
        passMarks: dto.passMarks,
        groupId: dto.groupId,
        status: dto.status ?? "draft",
        questions: {
          create: dto.questions.map((q) => ({
            type: q.type,
            text: q.text,
            options: q.options ?? [],
            correctAnswer: q.correctAnswer,
            marks: q.marks,
            explanation: q.explanation,
            order: q.order,
          })),
        },
      },
      include: { questions: { orderBy: { order: "asc" } } },
    });
  }

  private async withDerivedFields<T extends { id: string; groupId: string | null }>(tests: T[]) {
    const testIds = tests.map((t) => t.id);
    const groupIds = [...new Set(tests.map((t) => t.groupId).filter((id): id is string => !!id))];

    const [questionCounts, submissions, groups] = await Promise.all([
      testIds.length
        ? this.prisma.question.groupBy({ by: ["testId"], where: { testId: { in: testIds } }, _count: { testId: true } })
        : Promise.resolve([]),
      testIds.length
        ? this.prisma.testSubmission.findMany({ where: { testId: { in: testIds } } })
        : Promise.resolve([]),
      groupIds.length ? this.prisma.group.findMany({ where: { id: { in: groupIds } } }) : Promise.resolve([]),
    ]);

    const questionCountByTest = new Map(questionCounts.map((row) => [row.testId, row._count.testId]));
    const groupById = new Map(groups.map((g) => [g.id, g]));
    const submissionsByTest = new Map<string, typeof submissions>();
    for (const s of submissions) {
      const list = submissionsByTest.get(s.testId) ?? [];
      list.push(s);
      submissionsByTest.set(s.testId, list);
    }

    return tests.map((test) => {
      const testSubmissions = submissionsByTest.get(test.id) ?? [];
      const averageScore =
        testSubmissions.length > 0
          ? Math.round(testSubmissions.reduce((sum, s) => sum + s.percentage, 0) / testSubmissions.length)
          : null;
      return {
        ...test,
        questionCount: questionCountByTest.get(test.id) ?? 0,
        submissionCount: testSubmissions.length,
        averageScore,
        group: test.groupId && groupById.get(test.groupId) ? { id: test.groupId, name: groupById.get(test.groupId)!.name } : null,
      };
    });
  }

  async getTests(organizationId: string, teacherId: string, filters: TestFilters = {}) {
    const tests = await this.prisma.test.findMany({
      where: {
        organizationId,
        teacherId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.subject ? { subject: filters.subject } : {}),
        ...(filters.search
          ? {
              OR: [
                { title: { contains: filters.search, mode: "insensitive" } },
                { topic: { contains: filters.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return this.withDerivedFields(tests);
  }

  private async getOwnedTest(organizationId: string, teacherId: string, id: string) {
    const test = await this.prisma.test.findFirst({
      where: { id, organizationId, teacherId },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!test) {
      throw new NotFoundException("Test not found");
    }
    return test;
  }

  async getTestById(organizationId: string, teacherId: string, id: string) {
    const test = await this.getOwnedTest(organizationId, teacherId, id);
    const [withDerived] = await this.withDerivedFields([test]);
    return { ...withDerived, questions: test.questions };
  }

  async updateTest(organizationId: string, teacherId: string, id: string, dto: UpdateTestDto) {
    await this.getOwnedTest(organizationId, teacherId, id);
    if (dto.groupId) {
      await this.assertGroupBelongsToTeacher(organizationId, teacherId, dto.groupId);
    }

    const { questions, ...rest } = dto;

    await this.prisma.$transaction(async (tx) => {
      await tx.test.update({ where: { id }, data: rest });
      if (questions) {
        await tx.question.deleteMany({ where: { testId: id } });
        await tx.question.createMany({
          data: questions.map((q) => ({
            testId: id,
            type: q.type,
            text: q.text,
            options: q.options ?? [],
            correctAnswer: q.correctAnswer,
            marks: q.marks,
            explanation: q.explanation,
            order: q.order,
          })),
        });
      }
    });

    return this.getTestById(organizationId, teacherId, id);
  }

  async deleteTest(organizationId: string, teacherId: string, id: string) {
    await this.getOwnedTest(organizationId, teacherId, id);
    await this.prisma.test.delete({ where: { id } });
    return { id };
  }

  async publishTest(organizationId: string, teacherId: string, id: string, groupId: string) {
    await this.getOwnedTest(organizationId, teacherId, id);
    await this.assertGroupBelongsToTeacher(organizationId, teacherId, groupId);
    await this.prisma.test.update({ where: { id }, data: { status: "published", groupId } });
    return this.getTestById(organizationId, teacherId, id);
  }

  async closeTest(organizationId: string, teacherId: string, id: string) {
    await this.getOwnedTest(organizationId, teacherId, id);
    await this.prisma.test.update({ where: { id }, data: { status: "closed" } });
    return this.getTestById(organizationId, teacherId, id);
  }

  async getTestResults(organizationId: string, teacherId: string, id: string) {
    const test = await this.getOwnedTest(organizationId, teacherId, id);

    const totalStudents = test.groupId
      ? await this.prisma.groupMembership.count({ where: { organizationId, groupId: test.groupId, status: "active" } })
      : 0;

    const submissions = await this.prisma.testSubmission.findMany({ where: { testId: id }, orderBy: { submittedAt: "desc" } });
    const studentIds = [...new Set(submissions.map((s) => s.studentId))];
    const students = studentIds.length ? await this.prisma.student.findMany({ where: { id: { in: studentIds } } }) : [];
    const studentById = new Map(students.map((s) => [s.id, s]));

    const submittedCount = submissions.length;
    const averageScore = submittedCount > 0 ? Math.round(submissions.reduce((sum, s) => sum + s.percentage, 0) / submittedCount) : 0;
    const passRate =
      submittedCount > 0
        ? Math.round((submissions.filter((s) => s.totalScore >= test.passMarks).length / submittedCount) * 100)
        : 0;

    const rows = submissions.map((s) => ({
      submissionId: s.id,
      student: studentById.get(s.studentId) ? { id: s.studentId, name: studentById.get(s.studentId)!.name } : null,
      totalScore: s.totalScore,
      totalMarks: test.totalMarks,
      percentage: s.percentage,
      passed: s.totalScore >= test.passMarks,
      status: s.status,
      submittedAt: s.submittedAt,
      hasPendingEssay: (s.answers as unknown as StoredAnswer[]).some((a) => a.isCorrect === null),
    }));

    // Per-question analytics — % of submissions that got each question correct (essay questions excluded, since they're not auto-graded).
    const questionAnalytics = test.questions
      .filter((q) => q.type !== "essay")
      .map((q) => {
        let correctCount = 0;
        let answeredCount = 0;
        for (const s of submissions) {
          const answer = (s.answers as unknown as StoredAnswer[]).find((a) => a.questionId === q.id);
          if (!answer) continue;
          answeredCount += 1;
          if (answer.isCorrect) correctCount += 1;
        }
        return {
          questionId: q.id,
          text: q.text,
          order: q.order,
          correctPercentage: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0,
        };
      });

    return {
      summary: {
        totalStudents,
        submittedCount,
        notSubmittedCount: Math.max(0, totalStudents - submittedCount),
        averageScore,
        passRate,
      },
      rows,
      questionAnalytics,
    };
  }

  async getSubmissionDetail(organizationId: string, teacherId: string, testId: string, submissionId: string) {
    const test = await this.getOwnedTest(organizationId, teacherId, testId);
    const submission = await this.prisma.testSubmission.findFirst({ where: { id: submissionId, testId } });
    if (!submission) {
      throw new NotFoundException("Submission not found");
    }
    const student = await this.prisma.student.findFirst({ where: { id: submission.studentId } });
    const answers = submission.answers as unknown as StoredAnswer[];
    const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));

    return {
      submissionId: submission.id,
      student: student ? { id: student.id, name: student.name } : null,
      totalScore: submission.totalScore,
      totalMarks: test.totalMarks,
      percentage: submission.percentage,
      status: submission.status,
      feedback: submission.feedback,
      questions: test.questions.map((q) => {
        const given = answerByQuestion.get(q.id);
        return {
          id: q.id,
          type: q.type,
          text: q.text,
          options: q.options,
          marks: q.marks,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          yourAnswer: given?.answer ?? null,
          isCorrect: given?.isCorrect ?? null,
          marksObtained: given?.marksObtained ?? 0,
        };
      }),
    };
  }

  async gradeEssay(organizationId: string, teacherId: string, testId: string, submissionId: string, dto: GradeEssayDto) {
    const test = await this.getOwnedTest(organizationId, teacherId, testId);
    const submission = await this.prisma.testSubmission.findFirst({ where: { id: submissionId, testId } });
    if (!submission) {
      throw new NotFoundException("Submission not found");
    }

    const answers = submission.answers as unknown as StoredAnswer[];
    const index = answers.findIndex((a) => a.questionId === dto.questionId);
    if (index === -1) {
      throw new NotFoundException("Answer not found on this submission");
    }

    answers[index] = { ...answers[index], isCorrect: true, marksObtained: dto.marksObtained };
    const totalScore = answers.reduce((sum, a) => sum + a.marksObtained, 0);
    const percentage = test.totalMarks > 0 ? Math.round((totalScore / test.totalMarks) * 1000) / 10 : 0;
    const stillPending = answers.some((a) => a.isCorrect === null);

    return this.prisma.testSubmission.update({
      where: { id: submissionId },
      data: {
        answers: answers as unknown as Prisma.InputJsonValue,
        totalScore,
        percentage,
        status: stillPending ? "submitted" : "graded",
        feedback: dto.feedback ?? submission.feedback,
      },
    });
  }

  async getRecentTestsSummary(organizationId: string, teacherId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const [countThisMonth, myTests, recentTests] = await Promise.all([
      this.prisma.test.count({ where: { organizationId, teacherId, createdAt: { gte: startOfMonth } } }),
      this.prisma.test.findMany({ where: { organizationId, teacherId }, select: { id: true } }),
      this.prisma.test.findMany({ where: { organizationId, teacherId }, orderBy: { createdAt: "desc" }, take: 3 }),
    ]);

    const testIds = myTests.map((t) => t.id);
    const submissionsThisWeek = testIds.length
      ? await this.prisma.testSubmission.count({ where: { testId: { in: testIds }, submittedAt: { gte: startOfWeek } } })
      : 0;

    return {
      countThisMonth,
      submissionsThisWeek,
      recentTests: await this.withDerivedFields(recentTests),
    };
  }
}
