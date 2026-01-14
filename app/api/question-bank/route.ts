import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for creating a question
const createQuestionSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  topic: z.string().min(1, "Topic is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1, "Option text is required"),
        is_correct: z.boolean(),
      })
    )
    .min(2, "At least 2 options are required")
    .refine(
      (options) => options.some((opt) => opt.is_correct),
      "At least one option must be correct"
    ),
  explanation: z.string().nullable().optional(),
});

// GET: List all questions in the question bank
export async function GET() {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can access question bank" },
        { status: 403 }
      );
    }

    // Get all questions created by this teacher
    const questions = await prisma.question.findMany({
      where: {
        quiz: {
          createdById: profile.id,
        },
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            topic: true,
            difficulty: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    type QuestionMapItem = {
      id: string;
      questionText: string;
      topic: string;
      difficulty: string;
      options: { id: string; text: string; is_correct: boolean }[];
      explanation: string | null;
      usageCount: number;
      quizIds: string[];
      createdAt: string;
    };

    // Group by unique question text and get usage count
    const questionMap = new Map<string, QuestionMapItem>();

    questions.forEach((q) => {
      const key = q.questionText;
      if (questionMap.has(key)) {
        const existing = questionMap.get(key);
        existing.usageCount += 1;
        existing.quizIds.push(q.quiz.id);
      } else {
        questionMap.set(key, {
          id: q.id,
          questionText: q.questionText,
          topic: q.quiz.topic,
          difficulty: q.quiz.difficulty,
          options: q.options as { id: string; text: string; is_correct: boolean }[],
          explanation: q.explanation,
          usageCount: 1,
          quizIds: [q.quiz.id],
          createdAt: q.createdAt.toISOString(),
        });
      }
    });

    const uniqueQuestions = Array.from(questionMap.values());

    return NextResponse.json({
      success: true,
      questions: uniqueQuestions,
    });
  } catch (error) {
    console.error("Error fetching question bank:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

// POST: Add a new question to the question bank
export async function POST(request: Request) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can add questions to the bank" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = createQuestionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid question data",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { questionText, topic, difficulty, options, explanation } =
      validationResult.data;

    // Find or create a "Question Bank" quiz for this teacher
    let questionBankQuiz = await prisma.quiz.findFirst({
      where: {
        createdById: profile.id,
        title: "Question Bank",
        status: "draft",
      },
    });

    if (!questionBankQuiz) {
      // Create a question bank quiz
      questionBankQuiz = await prisma.quiz.create({
        data: {
          title: "Question Bank",
          description: "Reusable questions library",
          topic,
          difficulty,
          timeLimit: 900, // Default 15 minutes
          createdById: profile.id,
          status: "draft",
          totalQuestions: 0,
          geolocationEnabled: false,
        },
      });
    }

    // Get the current highest orderIndex for questions in this quiz
    const lastQuestion = await prisma.question.findFirst({
      where: { quizId: questionBankQuiz.id },
      orderBy: { orderIndex: "desc" },
    });

    const nextOrderIndex = lastQuestion ? lastQuestion.orderIndex + 1 : 0;

    // Create the question
    const question = await prisma.question.create({
      data: {
        quizId: questionBankQuiz.id,
        questionText,
        questionType: "mcq",
        points: 10,
        orderIndex: nextOrderIndex,
        options: options,
        explanation: explanation || null,
      },
    });

    // Update quiz question count
    await prisma.quiz.update({
      where: { id: questionBankQuiz.id },
      data: {
        totalQuestions: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      question: {
        id: question.id,
        questionText: question.questionText,
        topic,
        difficulty,
        options,
        explanation: question.explanation,
      },
    });
  } catch (error) {
    console.error("Error adding question to bank:", error);
    return NextResponse.json(
      { error: "Failed to add question" },
      { status: 500 }
    );
  }
}
