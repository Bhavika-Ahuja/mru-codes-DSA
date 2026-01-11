import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET /api/analytics/teacher - Get performance analytics for all students and sections
export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    
    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const section = searchParams.get("section");
    const studentId = searchParams.get("studentId");

    // Get all students with their performance metrics
    const studentsQuery: any = {
      role: "student",
    };

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
        section: true,
        avatarUrl: true,
        totalScore: true,
        quizzesTaken: true,
        createdAt: true,
      },
      orderBy: { totalScore: "desc" },
    });

    // Get detailed performance metrics for each student
    const studentsWithMetrics = await Promise.all(
      students.map(async (student) => {
        // Get session participations
        const participations = await prisma.sessionParticipant.findMany({
          where: { studentId: student.id },
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
          take: 50,
        });

        // Calculate metrics
        const totalSessions = participations.length;
        const avgScore =
          totalSessions > 0
            ? participations.reduce((sum, p) => sum + p.sessionScore, 0) /
              totalSessions
            : 0;
        const avgAccuracy =
          totalSessions > 0
            ? participations.reduce(
                (sum, p) =>
                  sum + (p.questionsAnswered > 0
                    ? (p.correctAnswers / p.questionsAnswered) * 100
                    : 0),
                0
              ) / totalSessions
            : 0;

        // Get submissions for topic analysis
        const submissions = await prisma.submission.findMany({
          where: { studentId: student.id },
          include: {
            question: {
              include: {
                quiz: {
                  select: {
                    topic: true,
                    difficulty: true,
                  },
                },
              },
            },
          },
          take: 200,
        });

        // Group by topic
        const topicPerformance: Record<string, { correct: number; total: number; score: number }> = {};
        submissions.forEach((sub) => {
          const topic = sub.question.quiz.topic;
          if (!topicPerformance[topic]) {
            topicPerformance[topic] = { correct: 0, total: 0, score: 0 };
          }
          topicPerformance[topic].total++;
          if (sub.isCorrect) {
            topicPerformance[topic].correct++;
          }
          topicPerformance[topic].score += sub.score;
        });

        // Group by difficulty
        const difficultyPerformance: Record<string, { correct: number; total: number; score: number }> = {};
        submissions.forEach((sub) => {
          const difficulty = sub.question.quiz.difficulty;
          if (!difficultyPerformance[difficulty]) {
            difficultyPerformance[difficulty] = { correct: 0, total: 0, score: 0 };
          }
          difficultyPerformance[difficulty].total++;
          if (sub.isCorrect) {
            difficultyPerformance[difficulty].correct++;
          }
          difficultyPerformance[difficulty].score += sub.score;
        });

        // Get recent quiz performance (last 10 sessions)
        const recentSessions = participations.slice(0, 10).map((p) => ({
          date: p.joinedAt.toISOString().split("T")[0],
          score: p.sessionScore,
          accuracy: p.questionsAnswered > 0
            ? (p.correctAnswers / p.questionsAnswered) * 100
            : 0,
          quizTitle: p.session.quiz.title,
          topic: p.session.quiz.topic,
        }));

        // Get assignment performance
        const assignments = await prisma.assignmentSubmission.findMany({
          where: { studentId: student.id },
          include: {
            assignment: {
              select: {
                title: true,
                maxPoints: true,
                topic: true,
              },
            },
          },
          orderBy: { submittedAt: "desc" },
        });

        const assignmentPerformance = assignments.map((a) => ({
          assignmentTitle: a.assignment.title,
          topic: a.assignment.topic,
          grade: a.grade,
          maxPoints: a.assignment.maxPoints,
          percentage: a.grade !== null && a.assignment.maxPoints > 0
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
            assignmentPerformance,
          },
        };
      })
    );

    // Get all unique sections
    const sections = await prisma.profile.findMany({
      where: { role: "student", section: { not: null } },
      select: { section: true },
      distinct: ["section"],
    });

    // Calculate section averages if section filter is not applied
    let sectionStats: Array<{ section: string; avgScore: number; totalStudents: number; avgAccuracy: number }> = [];
    if (!section) {
      const uniqueSections = [...new Set(sections.map((s) => s.section).filter(Boolean))];
      
      sectionStats = await Promise.all(
        uniqueSections.map(async (sec) => {
          const secStudents = await prisma.profile.findMany({
            where: { role: "student", section: sec },
            select: { id: true },
          });

          const secParticipations = await prisma.sessionParticipant.findMany({
            where: {
              studentId: { in: secStudents.map((s) => s.id) },
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
                    sum + (p.questionsAnswered > 0
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
