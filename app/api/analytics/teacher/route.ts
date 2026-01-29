import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// GET /api/analytics/teacher - Get performance analytics for all students and sections
export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    
    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const department = searchParams.get("department");
    const section = searchParams.get("section");
    const studentId = searchParams.get("studentId");

    // Get all students with their performance metrics
    const studentsQuery: Prisma.ProfileWhereInput = {
      role: "student",
    };

    if (department) {
      studentsQuery.department = department;
    }

    if (section) {
      studentsQuery.section = section;
    }

    if (studentId) {
      studentsQuery.id = studentId;
    }

    const students = await prisma.profile.findMany({
      where: studentsQuery,
      select: {
        id: true,
        fullName: true,
        email: true,
        rollNumber: true,
        department: true,
        section: true,
        avatarUrl: true,
        totalScore: true,
        quizzesTaken: true,
        createdAt: true,
      },
      orderBy: { totalScore: "desc" },
    });

    const studentIds = students.map((s) => s.id);
    const studentById = new Map(students.map((s) => [s.id, s]));

    // Teacher-scoped: sessions hosted by this teacher
    const teacherSessions = await prisma.quizSession.findMany({
      where: { hostId: profile.id },
      select: { id: true },
    });
    const teacherSessionIds = teacherSessions.map((s) => s.id);

    // Participations in teacher-hosted sessions only (for filtered students)
    const participations =
      teacherSessionIds.length > 0 && studentIds.length > 0
        ? await prisma.sessionParticipant.findMany({
            where: {
              sessionId: { in: teacherSessionIds },
              studentId: { in: studentIds },
            },
            include: {
              session: {
                include: {
                  quiz: {
                    select: {
                      id: true,
                      title: true,
                      topic: true,
                      difficulty: true,
                    },
                  },
                },
              },
            },
            orderBy: { joinedAt: "desc" },
          })
        : [];

    // Submissions in teacher-hosted sessions (for topic/difficulty)
    const submissions =
      teacherSessionIds.length > 0 && studentIds.length > 0
        ? await prisma.submission.findMany({
            where: {
              sessionId: { in: teacherSessionIds },
              studentId: { in: studentIds },
            },
            include: {
              question: {
                include: {
                  quiz: {
                    select: { topic: true, difficulty: true },
                  },
                },
              },
            },
            take: 2000,
          })
        : [];

    const participationsByStudent = new Map<string, typeof participations>();
    for (const p of participations) {
      const list = participationsByStudent.get(p.studentId) ?? [];
      list.push(p);
      participationsByStudent.set(p.studentId, list);
    }

    const submissionsByStudent = new Map<string, typeof submissions>();
    for (const s of submissions) {
      const list = submissionsByStudent.get(s.studentId) ?? [];
      list.push(s);
      submissionsByStudent.set(s.studentId, list);
    }

    // Build quizzes: distinct quizzes with per-quiz student performances
    const quizMap = new Map<
      string,
      {
        id: string;
        title: string;
        topic: string;
        difficulty: string;
        studentPerformances: Array<{
          studentId: string;
          fullName: string;
          rollNumber: string | null;
          department: string | null;
          section: string | null;
          date: string;
          score: number;
          accuracy: number;
          questionsAnswered: number;
          correctAnswers: number;
        }>;
      }
    >();
    for (const p of participations) {
      const q = p.session.quiz;
      if (!quizMap.has(q.id)) {
        quizMap.set(q.id, {
          id: q.id,
          title: q.title,
          topic: q.topic,
          difficulty: q.difficulty,
          studentPerformances: [],
        });
      }
      const student = studentById.get(p.studentId);
      if (!student) continue;
      const acc = p.questionsAnswered > 0 ? (p.correctAnswers / p.questionsAnswered) * 100 : 0;
      quizMap.get(q.id)!.studentPerformances.push({
        studentId: student.id,
        fullName: student.fullName,
        rollNumber: student.rollNumber,
        department: student.department,
        section: student.section,
        date: p.joinedAt.toISOString().split("T")[0],
        score: p.sessionScore,
        accuracy: Math.round(acc * 100) / 100,
        questionsAnswered: p.questionsAnswered,
        correctAnswers: p.correctAnswers,
      });
    }
    const quizzes = Array.from(quizMap.values());

    // Get assignment performance per student (unchanged)
    const assignmentSubmissions = await prisma.assignmentSubmission.findMany({
      where: { studentId: { in: studentIds } },
      include: {
        assignment: {
          select: { title: true, maxPoints: true, topic: true },
        },
      },
      orderBy: { submittedAt: "desc" },
    });
    const assignmentsByStudent = new Map<string, typeof assignmentSubmissions>();
    for (const a of assignmentSubmissions) {
      const list = assignmentsByStudent.get(a.studentId) ?? [];
      list.push(a);
      assignmentsByStudent.set(a.studentId, list);
    }

    const studentsWithMetrics = students.map((student) => {
      const studentParticipations = participationsByStudent.get(student.id) ?? [];
      const studentSubmissions = submissionsByStudent.get(student.id) ?? [];
      const totalSessions = studentParticipations.length;
      const avgScore =
        totalSessions > 0
          ? studentParticipations.reduce((sum, p) => sum + p.sessionScore, 0) / totalSessions
          : 0;
      const avgAccuracy =
        totalSessions > 0
          ? studentParticipations.reduce(
              (sum, p) =>
                sum +
                (p.questionsAnswered > 0
                  ? (p.correctAnswers / p.questionsAnswered) * 100
                  : 0),
              0
            ) / totalSessions
          : 0;

      const topicPerformance: Record<string, { correct: number; total: number; score: number }> = {};
      for (const sub of studentSubmissions) {
        const topic = sub.question.quiz.topic;
        if (!topicPerformance[topic]) topicPerformance[topic] = { correct: 0, total: 0, score: 0 };
        topicPerformance[topic].total++;
        if (sub.isCorrect) topicPerformance[topic].correct++;
        topicPerformance[topic].score += sub.score;
      }

      const difficultyPerformance: Record<string, { correct: number; total: number; score: number }> = {};
      for (const sub of studentSubmissions) {
        const d = sub.question.quiz.difficulty;
        if (!difficultyPerformance[d]) difficultyPerformance[d] = { correct: 0, total: 0, score: 0 };
        difficultyPerformance[d].total++;
        if (sub.isCorrect) difficultyPerformance[d].correct++;
        difficultyPerformance[d].score += sub.score;
      }

      const recentSessions = studentParticipations.slice(0, 10).map((p) => ({
        date: p.joinedAt.toISOString().split("T")[0],
        score: p.sessionScore,
        accuracy:
          p.questionsAnswered > 0 ? (p.correctAnswers / p.questionsAnswered) * 100 : 0,
        quizTitle: p.session.quiz.title,
        topic: p.session.quiz.topic,
      }));

      const quizPerformance = studentParticipations.map((p) => {
        const acc = p.questionsAnswered > 0 ? (p.correctAnswers / p.questionsAnswered) * 100 : 0;
        return {
          quizId: p.session.quiz.id,
          quizTitle: p.session.quiz.title,
          topic: p.session.quiz.topic,
          difficulty: p.session.quiz.difficulty,
          date: p.joinedAt.toISOString().split("T")[0],
          score: p.sessionScore,
          accuracy: Math.round(acc * 100) / 100,
        };
      });

      const assignmentList = assignmentsByStudent.get(student.id) ?? [];
      const assignmentPerformance = assignmentList.map((a) => ({
        assignmentTitle: a.assignment.title,
        topic: a.assignment.topic,
        grade: a.grade,
        maxPoints: a.assignment.maxPoints,
        percentage:
          a.grade != null && a.assignment.maxPoints > 0
            ? (a.grade / a.assignment.maxPoints) * 100
            : null,
        submittedAt: a.submittedAt.toISOString(),
      }));

      return {
        ...student,
        metrics: {
          totalSessions,
          avgScore: Math.round(avgScore * 100) / 100,
          avgAccuracy: Math.round(avgAccuracy * 100) / 100,
          topicPerformance,
          difficultyPerformance,
          recentSessions,
          quizPerformance,
          assignmentPerformance,
        },
      };
    });

    // Get all unique departments (for filtering UI)
    const departments = await prisma.profile.findMany({
      where: { role: "student", department: { not: null } },
      select: { department: true },
      distinct: ["department"],
    });

    // Get all unique sections
    const sections = await prisma.profile.findMany({
      where: {
        role: "student",
        section: { not: null },
        ...(department ? { department } : {}),
      },
      select: { section: true },
      distinct: ["section"],
    });

    // Calculate section averages (teacher-scoped participations) if section filter is not applied
    let sectionStats: Array<{ section: string; avgScore: number; totalStudents: number; avgAccuracy: number }> = [];
    if (!section && teacherSessionIds.length > 0) {
      const uniqueSections = [...new Set(sections.map((s) => s.section).filter(Boolean))];

      sectionStats = await Promise.all(
        uniqueSections.map(async (sec) => {
          const secStudents = await prisma.profile.findMany({
            where: {
              role: "student",
              section: sec,
              ...(department ? { department } : {}),
            },
            select: { id: true },
          });
          const secIds = secStudents.map((s) => s.id);

          const secParticipations = await prisma.sessionParticipant.findMany({
            where: {
              sessionId: { in: teacherSessionIds },
              studentId: { in: secIds },
            },
          });

          const avgScore =
            secParticipations.length > 0
              ? secParticipations.reduce((sum, p) => sum + p.sessionScore, 0) /
                secParticipations.length
              : 0;

          const avgAccuracy =
            secParticipations.length > 0
              ? secParticipations.reduce(
                  (sum, p) =>
                    sum +
                    (p.questionsAnswered > 0
                      ? (p.correctAnswers / p.questionsAnswered) * 100
                      : 0),
                  0
                ) / secParticipations.length
              : 0;

          return {
            section: sec!,
            avgScore: Math.round(avgScore * 100) / 100,
            totalStudents: secStudents.length,
            avgAccuracy: Math.round(avgAccuracy * 100) / 100,
          };
        })
      );
    }

    return NextResponse.json({
      students: studentsWithMetrics,
      quizzes,
      departments: departments.map((d) => d.department).filter(Boolean),
      sections: sections.map((s) => s.section).filter(Boolean),
      sectionStats,
    });
  } catch (error) {
    console.error("Error fetching teacher analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
