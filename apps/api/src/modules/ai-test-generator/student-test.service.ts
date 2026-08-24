import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { SubmitTestDto } from "./dto/submit-test.dto";

interface StoredAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean | null;
  marksObtained: number;
}

@Injectable()
export class StudentTestService {
  constructor(private readonly prisma: PrismaService) {}

  private async myActiveGroupIds(organizationId: string, studentId: string) {
    const memberships = await this.prisma.groupMembership.findMany({
      where: { organizationId, studentId, status: "active" },
    });
    return memberships.map((m) => m.groupId);
  }

  /** Published tests assigned to the student's groups, excluding ones already submitted. */
  async getAvailableTests(organizationId: string, studentId: string) {
    const groupIds = await this.myActiveGroupIds(organizationId, studentId);
    if (groupIds.length === 0) return [];

    const [tests, mySubmissions] = await Promise.all([
      this.prisma.test.findMany({
        where: { organizationId, status: "published", groupId: { in: groupIds } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.testSubmission.findMany({ where: { organizationId, studentId }, select: { testId: true } }),
    ]);

    const submittedTestIds = new Set(mySubmissions.map((s) => s.testId));
    const testIds = tests.map((t) => t.id);
    const questionCounts = testIds.length
      ? await this.prisma.question.groupBy({ by: ["testId"], where: { testId: { in: testIds } }, _count: { testId: true } })
      : [];
    const questionCountByTest = new Map(questionCounts.map((row) => [row.testId, row._count.testId]));

    return tests
      .filter((t) => !submittedTestIds.has(t.id))
      .map((t) => ({ ...t, questionCount: questionCountByTest.get(t.id) ?? 0 }));
  }

  private async assertAssignedAndPublished(organizationId: string, studentId: string, testId: string) {
    const test = await this.prisma.test.findFirst({ where: { id: testId, organizationId } });
    if (!test) {
      throw new NotFoundException("Test not found");
    }
    if (test.status !== "published") {
      throw new ForbiddenException("This test is not currently available");
    }
    const groupIds = await this.myActiveGroupIds(organizationId, studentId);
    if (!test.groupId || !groupIds.includes(test.groupId)) {
      throw new ForbiddenException("This test is not assigned to your group");
    }
    return test;
  }

  /** Questions WITHOUT correctAnswer/explanation — students can't see answers before submitting. */
  async getTestForTaking(organizationId: string, studentId: string, testId: string) {
    const test = await this.assertAssignedAndPublished(organizationId, studentId, testId);

    const existing = await this.prisma.testSubmission.findUnique({
      where: { testId_studentId: { testId, studentId } },
    });
    if (existing) {
      throw new ConflictException("You have already submitted this test");
    }

    const questions = await this.prisma.question.findMany({ where: { testId }, orderBy: { order: "asc" } });
    return {
      ...test,
      questions: questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options,
        marks: q.marks,
        order: q.order,
      })),
    };
  }

  async submitTest(organizationId: string, studentId: string, testId: string, dto: SubmitTestDto) {
    const test = await this.assertAssignedAndPublished(organizationId, studentId, testId);

    const existing = await this.prisma.testSubmission.findUnique({
      where: { testId_studentId: { testId, studentId } },
    });
    if (existing) {
      throw new ConflictException("You have already submitted this test");
    }

    const questions = await this.prisma.question.findMany({ where: { testId } });
    const questionById = new Map(questions.map((q) => [q.id, q]));

    const answers: StoredAnswer[] = dto.answers.map((a) => {
      const question = questionById.get(a.questionId);
      if (!question) {
        return { questionId: a.questionId, answer: a.answer, isCorrect: null, marksObtained: 0 };
      }
      if (question.type === "essay") {
        return { questionId: a.questionId, answer: a.answer, isCorrect: null, marksObtained: 0 };
      }
      const normalize = (s: string) => s.trim().toLowerCase();
      const isCorrect = question.correctAnswer != null && normalize(a.answer) === normalize(question.correctAnswer);
      return { questionId: a.questionId, answer: a.answer, isCorrect, marksObtained: isCorrect ? question.marks : 0 };
    });

    const totalScore = answers.reduce((sum, a) => sum + a.marksObtained, 0);
    const percentage = test.totalMarks > 0 ? Math.round((totalScore / test.totalMarks) * 1000) / 10 : 0;
    const hasPendingEssay = answers.some((a) => a.isCorrect === null);

    try {
      return await this.prisma.testSubmission.create({
        data: {
          organizationId,
          testId,
          studentId,
          answers: answers as unknown as Prisma.InputJsonValue,
          totalScore,
          percentage,
          status: hasPendingEssay ? "submitted" : "graded",
          submittedAt: new Date(),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException("You have already submitted this test");
      }
      throw err;
    }
  }

  async getOwnResult(organizationId: string, studentId: string, testId: string) {
    const test = await this.prisma.test.findFirst({ where: { id: testId, organizationId } });
    if (!test) {
      throw new NotFoundException("Test not found");
    }
    const submission = await this.prisma.testSubmission.findUnique({ where: { testId_studentId: { testId, studentId } } });
    if (!submission) {
      throw new NotFoundException("You have not submitted this test yet");
    }

    const questions = await this.prisma.question.findMany({ where: { testId }, orderBy: { order: "asc" } });
    const answers = submission.answers as unknown as StoredAnswer[];
    const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));

    return {
      test: { id: test.id, title: test.title, totalMarks: test.totalMarks, passMarks: test.passMarks },
      totalScore: submission.totalScore,
      percentage: submission.percentage,
      passed: submission.totalScore >= test.passMarks,
      status: submission.status,
      feedback: submission.feedback,
      questions: questions.map((q) => {
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
}
