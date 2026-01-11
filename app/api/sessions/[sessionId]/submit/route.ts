import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const submitSchema = z.object({
  questionId: z.string().uuid(),
  selectedOptionId: z.string(),
  timeTaken: z.number().optional(),
});

// POST: Submit an answer
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
    const validation = submitSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { questionId, selectedOptionId, timeTaken } = validation.data;

    // Get the session and verify it's live
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
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

    // Verify the question exists in the quiz (students control their own progression)
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { quiz: true },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    if (question.quizId !== session.quizId) {
      return NextResponse.json(
        { error: "Question does not belong to this quiz" },
        { status: 400 }
      );
    }

    // Verify user is a participant
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

    // Check for existing submission
    const existingSubmission = await prisma.submission.findUnique({
      where: {
        sessionId_questionId_studentId: {
          sessionId,
          questionId,
          studentId: user.id,
        },
      },
    });

    if (existingSubmission) {
      return NextResponse.json(
        { error: "Already submitted for this question" },
        { status: 400 }
      );
    }

    // Check if the selected option is correct (question already fetched above)
    const options = question.options as { id: string; text: string; is_correct: boolean }[];
    const selectedOption = options.find((o) => o.id === selectedOptionId);
    const correctOption = options.find((o) => o.is_correct);
    const isCorrect = selectedOption?.is_correct ?? false;

    // Calculate score (base points, can add time bonus later)
    const score = isCorrect ? question.points : 0;

    // Create submission using transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create submission
      const submission = await tx.submission.create({
        data: {
          sessionId,
          questionId,
          studentId: user.id,
          selectedOptionId,
          isCorrect,
          score,
          timeTaken,
        },
      });

      // Update participant stats
      await tx.sessionParticipant.update({
        where: { id: participant.id },
        data: {
          sessionScore: { increment: score },
          questionsAnswered: { increment: 1 },
          correctAnswers: { increment: isCorrect ? 1 : 0 },
        },
      });

      // Update profile total score if correct
      if (isCorrect) {
        await tx.profile.update({
          where: { id: user.id },
          data: {
            totalScore: { increment: score },
          },
        });
      }

      return submission;
    });

    // Broadcast score update via REST (server-side)
    const channel = supabase.channel(`quiz-session-${sessionId}`);
    await channel.subscribe();
    await (channel.httpSend as (
      event: string,
      payload: Record<string, unknown>
    ) => Promise<unknown>)(
      "score_update",
      {
        user_id: user.id,
        score: participant.sessionScore + score,
      }
    );

    return NextResponse.json({
      success: true,
      submission: {
        id: result.id,
        isCorrect,
        score,
        correctOptionId: correctOption?.id,
        explanation: question.explanation,
      },
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 }
    );
  }
}

