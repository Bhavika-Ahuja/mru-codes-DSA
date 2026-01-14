import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

// GET: Get detailed quiz review for a specific session
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "student") {
      return NextResponse.json(
        { error: "Only students can access quiz reviews" },
        { status: 403 }
      );
    }

    // Get session participant
    const participant = await prisma.sessionParticipant.findFirst({
      where: {
        sessionId,
        studentId: profile.id,
      },
      include: {
        session: {
          include: {
            quiz: {
              include: {
                questions: {
                  orderBy: {
                    orderIndex: "asc",
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Quiz review not found" },
        { status: 404 }
      );
    }

    // Get all submissions for this session
    const submissions = await prisma.submission.findMany({
      where: {
        sessionId,
        studentId: profile.id,
      },
      orderBy: {
        submittedAt: "asc",
      },
    });

    // Calculate accuracy
    const accuracy =
      participant.questionsAnswered > 0
        ? (participant.correctAnswers / participant.questionsAnswered) * 100
        : 0;

    // Calculate max possible score (sum question points)
    const maxScore = participant.session.quiz.questions.reduce(
      (sum, q) => sum + (q.points ?? 0),
      0
    );

    // Map questions with submissions
    const questionsWithAnswers = participant.session.quiz.questions.map((question) => {
      const submission = submissions.find((s) => s.questionId === question.id);
      const options = asArray<{ id?: string; text?: string; is_correct?: boolean }>(
        question.options
      );
      return {
        id: question.id,
        questionText: question.questionText,
        points: question.points,
        options: options.map((opt, idx) => ({
          id: opt.id ?? String(idx),
          text: opt.text ?? "",
          is_correct: Boolean(opt.is_correct),
        })),
        explanation: question.explanation,
        submittedAnswer: {
          selectedOptionId: submission?.selectedOptionId ?? null,
          answerText: submission?.answerText ?? null,
          isCorrect: submission?.isCorrect ?? null,
          score: submission?.score ?? 0,
        },
      };
    });

    const submissionData = submissions.map((s) => ({
      questionId: s.questionId,
      // legacy + new naming
      optionId: s.selectedOptionId,
      selectedOptionId: s.selectedOptionId,
      answerText: s.answerText,
      isCorrect: s.isCorrect,
      score: s.score,
      submittedAt: s.submittedAt.toISOString(),
    }));

    const review = {
      sessionId: participant.sessionId,
      quizTitle: participant.session.quiz.title,
      topic: participant.session.quiz.topic,
      difficulty: participant.session.quiz.difficulty,
      totalScore: participant.sessionScore,
      maxScore,
      accuracy,
      questionsAnswered: participant.questionsAnswered,
      totalQuestions: participant.session.quiz.totalQuestions,
      completedAt:
        participant.session.endedAt?.toISOString() ||
        participant.joinedAt.toISOString(),
      questions: questionsWithAnswers,
      submissions: submissionData,
      // Backward compatibility for older UI expecting `answers`
      answers: submissionData,
    };

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error("Error fetching quiz review:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz review" },
      { status: 500 }
    );
  }
}
