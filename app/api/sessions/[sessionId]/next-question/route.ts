import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// POST: Student moves to next question
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

    // Move to next question
    const nextIndex = participant.currentQuestionIndex + 1;
    const totalQuestions = session.quiz.questions.length;

    if (nextIndex >= totalQuestions) {
      return NextResponse.json({
        success: true,
        currentQuestionIndex: participant.currentQuestionIndex,
        isComplete: true,
        message: "All questions completed",
      });
    }

    // Update participant's current question index
    await prisma.sessionParticipant.update({
      where: { id: participant.id },
      data: {
        currentQuestionIndex: nextIndex,
      },
    });

    const nextQuestion = session.quiz.questions[nextIndex];

    return NextResponse.json({
      success: true,
      currentQuestionIndex: nextIndex,
      question: {
        id: nextQuestion.id,
        questionText: nextQuestion.questionText,
        options: (nextQuestion.options as { id: string; text: string }[]).map(
          (o) => ({
            id: o.id,
            text: o.text,
          })
        ),
        orderIndex: nextQuestion.orderIndex,
        points: nextQuestion.points,
      },
      isComplete: false,
    });
  } catch (error) {
    console.error("Error moving to next question:", error);
    return NextResponse.json(
      { error: "Failed to move to next question" },
      { status: 500 }
    );
  }
}
