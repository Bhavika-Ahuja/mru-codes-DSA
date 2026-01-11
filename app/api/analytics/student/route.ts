import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET /api/analytics/student - Get performance analytics for the current student
export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    
    if (!profile || profile.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get session participations
    const participations = await prisma.sessionParticipant.findMany({
      where: { studentId: profile.id },
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
    });

    // Calculate overall metrics
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

    // Get submissions for detailed analysis
    const submissions = await prisma.submission.findMany({
      where: { studentId: profile.id },
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
      orderBy: { submittedAt: "desc" },
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

    // Get performance over time (last 20 sessions)
    const performanceOverTime = participations
      .slice(0, 20)
      .reverse()
      .map((p) => ({
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
      where: { studentId: profile.id },
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

    // Get section rank
    let sectionRank = null;
    if (profile.section) {
      const sectionStudents = await prisma.profile.findMany({
        where: {
          role: "student",
          section: profile.section,
        },
        select: {
          id: true,
          totalScore: true,
        },
        orderBy: { totalScore: "desc" },
      });

      const rank = sectionStudents.findIndex((s) => s.id === profile.id) + 1;
      sectionRank = {
        rank,
        totalInSection: sectionStudents.length,
      };
    }

    return NextResponse.json({
      overview: {
        totalScore: profile.totalScore,
        quizzesTaken: profile.quizzesTaken,
        totalSessions,
        avgScore: Math.round(avgScore * 100) / 100,
        avgAccuracy: Math.round(avgAccuracy * 100) / 100,
        sectionRank,
      },
      topicPerformance,
      difficultyPerformance,
      performanceOverTime,
      assignmentPerformance,
    });
  } catch (error) {
    console.error("Error fetching student analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
