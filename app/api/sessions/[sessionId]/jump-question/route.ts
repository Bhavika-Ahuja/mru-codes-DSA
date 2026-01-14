import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const jumpQuestionSchema = z.object({
  questionIndex: z.number().int().min(0),
});

// POST: Student jumps to a specific question
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = jumpQuestionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { questionIndex } = validation.data;

    // Get session
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.status !== "live") {
      return NextResponse.json(
        { error: "Session is not live" },
        { status: 400 }
      );
    }

    // Validate question index
    if (questionIndex < 0 || questionIndex >= session.quiz.questions.length) {
      return NextResponse.json(
        { error: "Invalid question index" },
        { status: 400 }
      );
    }

    // Get participant
    const participant = await prisma.sessionParticipant.findUnique({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId: user.id,
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "You are not a participant in this session" },
        { status: 403 }
      );
    }

    // Update participant's current question index
    await prisma.sessionParticipant.update({
      where: { id: participant.id },
      data: {
        currentQuestionIndex: questionIndex,
      },
    });

    const targetQuestion = session.quiz.questions[questionIndex];

    return NextResponse.json({
      success: true,
      currentQuestionIndex: questionIndex,
      question: {
        id: targetQuestion.id,
        questionText: targetQuestion.questionText,
        options: (targetQuestion.options as { id: string; text: string }[]).map(
          (o) => ({
            id: o.id,
            text: o.text,
          })
        ),
        orderIndex: targetQuestion.orderIndex,
        points: targetQuestion.points,
      },
    });
  } catch (error) {
    console.error("Error jumping to question:", error);
    return NextResponse.json(
      { error: "Failed to jump to question" },
      { status: 500 }
    );
  }
}
