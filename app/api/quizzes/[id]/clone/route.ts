import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// POST /api/quizzes/[id]/clone - Clone a quiz
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can clone quizzes" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Get the original quiz with questions
    const originalQuiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!originalQuiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    // Verify the quiz belongs to the teacher (optional - can clone any quiz)
    // You might want to remove this check if teachers should clone any quiz
    // if (originalQuiz.createdById !== profile.id) {
    //   return NextResponse.json(
    //     { error: "You can only clone your own quizzes" },
    //     { status: 403 }
    //   );
    // }

    // Clone the quiz with a new title
    const clonedQuiz = await prisma.$transaction(async (tx) => {
      // Create the cloned quiz
      const newQuiz = await tx.quiz.create({
        data: {
          title: `${originalQuiz.title} (Copy)`,
          description: originalQuiz.description,
          topic: originalQuiz.topic,
          difficulty: originalQuiz.difficulty,
          timeLimit: originalQuiz.timeLimit,
          geolocationEnabled: originalQuiz.geolocationEnabled,
          createdById: profile.id,
          status: "draft",
          totalQuestions: originalQuiz.questions.length,
        },
      });

      // Clone all questions
      await tx.question.createMany({
        data: originalQuiz.questions.map((q) => ({
          quizId: newQuiz.id,
          questionText: q.questionText,
          questionType: q.questionType,
          points: q.points,
          timeLimit: q.timeLimit,
          orderIndex: q.orderIndex,
          options: q.options,
          codeTemplate: q.codeTemplate,
          explanation: q.explanation,
        })),
      });

      return newQuiz;
    });

    return NextResponse.json({
      success: true,
      quiz: {
        id: clonedQuiz.id,
        title: clonedQuiz.title,
      },
    });
  } catch (error) {
    console.error("Error cloning quiz:", error);
    return NextResponse.json(
      { error: "Failed to clone quiz" },
      { status: 500 }
    );
  }
}
