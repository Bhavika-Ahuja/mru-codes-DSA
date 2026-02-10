import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for quiz creation request
const createQuizSchema = z.object({
  quiz: z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    topic: z.string().min(2),
    difficulty: z.enum(["easy", "medium", "hard"]),
    timeLimit: z.number().min(60).max(3600).default(900),
    geolocationEnabled: z.boolean().optional().default(false),
  }),
  questions: z.array(
    z.object({
      questionText: z.string().min(1),
      options: z.array(
        z.object({
          id: z.string(),
          text: z.string().min(1),
          is_correct: z.boolean(),
        })
      ).min(2).max(6),
      explanation: z.string().optional(),
      orderIndex: z.number(),
    })
  ).min(1),
});

export async function POST(request: Request) {
  try {
    // Verify user is authenticated and is a teacher
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can create quizzes" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createQuizSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { quiz, questions } = validationResult.data;

    // Use Prisma transaction to create quiz and questions atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create the quiz
      const createdQuiz = await tx.quiz.create({
        data: {
          title: quiz.title,
          description: quiz.description || null,
          topic: quiz.topic,
          difficulty: quiz.difficulty,
          timeLimit: quiz.timeLimit,
          geolocationEnabled: quiz.geolocationEnabled || false,
          createdById: profile.id,
          status: "draft",
          totalQuestions: questions.length,
        },
      });

      // Create all questions
      const createdQuestions = await tx.question.createMany({
        data: questions.map((q) => ({
          quizId: createdQuiz.id,
          questionText: q.questionText,
          questionType: "mcq" as const,
          points: 10, // Default points
          orderIndex: q.orderIndex,
          options: q.options,
          explanation: q.explanation || null,
        })),
      });

      return {
        quiz: createdQuiz,
        questionsCount: createdQuestions.count,
      };
    });

    return NextResponse.json({
      success: true,
      quiz: {
        id: result.quiz.id,
        title: result.quiz.title,
        topic: result.quiz.topic,
        difficulty: result.quiz.difficulty,
        questionsCount: result.questionsCount,
      },
    });
  } catch (error) {
    console.error("Error creating quiz:", error);
    return NextResponse.json(
      { error: "Failed to create quiz" },
      { status: 500 }
    );
  }
}

// GET: List quizzes — teachers see all teachers' quizzes; students are not allowed here
export async function GET(request: Request) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can list quizzes" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build filter — no createdById: all teachers see all quizzes
    const where: {
      status?: "draft" | "published" | "archived";
    } = {};

    if (status && ["draft", "published", "archived"].includes(status)) {
      where.status = status as "draft" | "published" | "archived";
    }

    // Fetch quizzes with question count, creator info, and statistics
    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: { questions: true },
          },
          createdBy: {
            select: { id: true, fullName: true },
          },
        },
      }),
      prisma.quiz.count({ where }),
    ]);

    // Get statistics for each quiz
    const quizzesWithStats = await Promise.all(
      quizzes.map(async (q) => {
        // Get all sessions for this quiz
        const sessions = await prisma.quizSession.findMany({
          where: { quizId: q.id },
          include: {
            participants: {
              select: {
                sessionScore: true,
                questionsAnswered: true,
                correctAnswers: true,
              },
            },
          },
        });

        // Check for live/active sessions
        const liveSession = sessions.find((s) => s.status === "live");
        let liveSessionInfo = null;
        
        if (liveSession && liveSession.startedAt && q.timeLimit) {
          const now = new Date();
          const startedAt = new Date(liveSession.startedAt);
          const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
          const timeRemaining = Math.max(0, q.timeLimit - elapsedSeconds);
          
          liveSessionInfo = {
            sessionId: liveSession.id,
            roomCode: liveSession.roomCode,
            timeRemaining: isNaN(timeRemaining) ? 0 : timeRemaining,
            timeLimit: q.timeLimit, // Include timeLimit for client-side calculation
            startedAt: liveSession.startedAt.toISOString(),
            currentQuestionIndex: liveSession.currentQuestionIndex,
            participantCount: liveSession.participants.length,
          };
        }

        const totalSessions = sessions.length;
        const totalParticipants = sessions.reduce(
          (sum, s) => sum + s.participants.length,
          0
        );
        
        // Calculate average score across all participants
        const allScores = sessions.flatMap((s) =>
          s.participants.map((p) => p.sessionScore)
        );
        const avgScore =
          allScores.length > 0
            ? Math.round(
                (allScores.reduce((sum, score) => sum + score, 0) /
                  allScores.length) *
                  100
              ) / 100
            : 0;

        // Calculate average accuracy
        const allAccuracies = sessions.flatMap((s) =>
          s.participants
            .filter((p) => p.questionsAnswered > 0)
            .map(
              (p) => (p.correctAnswers / p.questionsAnswered) * 100
            )
        );
        const avgAccuracy =
          allAccuracies.length > 0
            ? Math.round(
                (allAccuracies.reduce((sum, acc) => sum + acc, 0) /
                  allAccuracies.length) *
                  100
              ) / 100
            : 0;

        return {
          id: q.id,
          title: q.title,
          description: q.description,
          topic: q.topic,
          difficulty: q.difficulty,
          status: q.status,
          totalQuestions: q._count.questions,
          timeLimit: (q.timeLimit && !isNaN(Number(q.timeLimit)) && Number(q.timeLimit) > 0) ? Number(q.timeLimit) : 900, // Default to 15 minutes if null/undefined/invalid
          createdAt: q.createdAt.toISOString(),
          updatedAt: q.updatedAt.toISOString(),
          createdById: q.createdById,
          createdBy: q.createdBy ? { fullName: q.createdBy.fullName } : null,
          stats: {
            totalSessions,
            totalParticipants,
            avgScore,
            avgAccuracy,
          },
          liveSession: liveSessionInfo,
        };
      })
    );

    return NextResponse.json({
      success: true,
      quizzes: quizzesWithStats,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + quizzes.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}

