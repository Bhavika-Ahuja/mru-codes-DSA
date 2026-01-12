import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// GET: Get detailed quiz review for a specific session
export async function GET(
  request: Request,
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
                  include: {
                    options: true,
                  },
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

    // Get all answers for this session
    const answers = await prisma.answer.findMany({
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

    // Calculate max possible score
    const maxScore = participant.session.quiz.totalQuestions * 10;

    // Map questions with answers
    const questionsWithAnswers = participant.session.quiz.questions.map((question) => {
      const answer = answers.find((a) => a.questionId === question.id);
      return {
        id: question.id,
        questionText: question.questionText,
        topic: question.topic,
        difficulty: question.difficulty,
        points: question.points,
        options: question.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          is_correct: opt.is_correct,
        })),
        explanation: question.explanation,
      };
    });

    const answerData = answers.map((answer) => ({
      questionId: answer.questionId,
      optionId: answer.optionId,
      isCorrect: answer.isCorrect,
      score: answer.score,
      submittedAt: answer.submittedAt.toISOString(),
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
      answers: answerData,
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
