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
    timePerQuestion: z.number().min(10).max(300).default(30),
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
          timePerQuestion: quiz.timePerQuestion,
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

// GET: List quizzes for the current teacher
export async function GET(request: Request) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build filter
    const where: {
      createdById: string;
      status?: "draft" | "published" | "archived";
    } = {
      createdById: profile.id,
    };

    if (status && ["draft", "published", "archived"].includes(status)) {
      where.status = status as "draft" | "published" | "archived";
    }

    // Fetch quizzes with question count
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
        },
      }),
      prisma.quiz.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      quizzes: quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        topic: q.topic,
        difficulty: q.difficulty,
        status: q.status,
        totalQuestions: q._count.questions,
        timePerQuestion: q.timePerQuestion,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
      })),
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

