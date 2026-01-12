import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// POST: Mark question as used (for tracking)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can use questions" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Get question details
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        quiz: {
          select: {
            createdById: true,
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    if (question.quiz.createdById !== profile.id) {
      return NextResponse.json(
        { error: "You can only use your own questions" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      question: {
        id: question.id,
        questionText: question.questionText,
        options: question.options,
        explanation: question.explanation,
        points: question.points,
      },
    });
  } catch (error) {
    console.error("Error using question:", error);
    return NextResponse.json(
      { error: "Failed to use question" },
      { status: 500 }
    );
  }
}
