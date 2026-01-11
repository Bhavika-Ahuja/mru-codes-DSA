import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for updating session
const updateSessionSchema = z.object({
  action: z.enum(["start", "next_question", "end"]),
});

// GET: Get session details (for host or participant)
export async function GET(
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
        host: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        participants: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                section: true,
              },
            },
          },
          orderBy: { sessionScore: "desc" },
        },
        currentQuestion: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Check if user is host or participant
    const isHost = session.hostId === user.id;
    const isParticipant = session.participants.some(
      (p) => p.studentId === user.id
    );

    if (!isHost && !isParticipant) {
      // Return limited info for non-participants
      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          roomCode: session.roomCode,
          status: session.status,
          quiz: {
            title: session.quiz.title,
            topic: session.quiz.topic,
            geolocationEnabled: session.quiz.geolocationEnabled,
          },
          host: session.host,
          participantCount: session.participants.length,
        },
        isHost: false,
        isParticipant: false,
      });
    }

    // For host, return full data including questions
    if (isHost) {
      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          roomCode: session.roomCode,
          status: session.status,
          currentQuestionIndex: session.currentQuestionIndex,
          currentQuestionId: session.currentQuestionId,
          questionStartedAt: session.questionStartedAt?.toISOString(),
          startedAt: session.startedAt?.toISOString(),
          endedAt: session.endedAt?.toISOString(),
          quiz: {
            id: session.quiz.id,
            title: session.quiz.title,
            topic: session.quiz.topic,
            difficulty: session.quiz.difficulty,
            timePerQuestion: session.quiz.timePerQuestion,
            totalQuestions: session.quiz.questions.length,
            questions: session.quiz.questions.map((q) => ({
              id: q.id,
              questionText: q.questionText,
              options: q.options,
              explanation: q.explanation,
              orderIndex: q.orderIndex,
              points: q.points,
            })),
          },
          host: session.host,
          participants: session.participants.map((p) => ({
            id: p.id,
            score: p.sessionScore,
            questionsAnswered: p.questionsAnswered,
            correctAnswers: p.correctAnswers,
            student: p.student,
          })),
        },
        isHost: true,
        isParticipant: false,
      });
    }

    // For participants, return safe data (no correct answers)
    const currentQuestion = session.currentQuestion
      ? {
          id: session.currentQuestion.id,
          questionText: session.currentQuestion.questionText,
          options: (session.currentQuestion.options as { id: string; text: string }[]).map(
            (o) => ({
              id: o.id,
              text: o.text,
            })
          ),
          orderIndex: session.currentQuestion.orderIndex,
          points: session.currentQuestion.points,
        }
      : null;

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        roomCode: session.roomCode,
        status: session.status,
        currentQuestionIndex: session.currentQuestionIndex,
        questionStartedAt: session.questionStartedAt?.toISOString(),
        quiz: {
          title: session.quiz.title,
          topic: session.quiz.topic,
          difficulty: session.quiz.difficulty,
          timePerQuestion: session.quiz.timePerQuestion,
          totalQuestions: session.quiz.questions.length,
          geolocationEnabled: session.quiz.geolocationEnabled,
        },
        host: session.host,
        currentQuestion,
        participantCount: session.participants.length,
      },
      isHost: false,
      isParticipant: true,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

// PATCH: Update session state (host only)
export async function PATCH(
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

    // Get session and verify host
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

    if (session.hostId !== user.id) {
      return NextResponse.json(
        { error: "Only the host can control this session" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { action } = validation.data;
    const questions = session.quiz.questions;
    const now = new Date();

    let updateData: {
      status?: "waiting" | "live" | "completed";
      currentQuestionId?: string | null;
      currentQuestionIndex?: number;
      questionStartedAt?: Date | null;
      startedAt?: Date | null;
      endedAt?: Date | null;
    } = {};

    switch (action) {
      case "start":
        if (session.status !== "waiting") {
          return NextResponse.json(
            { error: "Session already started" },
            { status: 400 }
          );
        }
        if (questions.length === 0) {
          return NextResponse.json(
            { error: "Quiz has no questions" },
            { status: 400 }
          );
        }
        updateData = {
          status: "live",
          currentQuestionId: questions[0].id,
          currentQuestionIndex: 0,
          questionStartedAt: now,
          startedAt: now,
        };
        break;

      case "next_question":
        if (session.status !== "live") {
          return NextResponse.json(
            { error: "Session is not live" },
            { status: 400 }
          );
        }
        const nextIndex = session.currentQuestionIndex + 1;
        if (nextIndex >= questions.length) {
          // No more questions, end the quiz
          updateData = {
            status: "completed",
            currentQuestionId: null,
            endedAt: now,
          };
        } else {
          updateData = {
            currentQuestionId: questions[nextIndex].id,
            currentQuestionIndex: nextIndex,
            questionStartedAt: now,
          };
        }
        break;

      case "end":
        updateData = {
          status: "completed",
          currentQuestionId: null,
          endedAt: now,
        };
        break;
    }

    // Update the session
    const updatedSession = await prisma.quizSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    // Update the session in Supabase for realtime triggers
    await supabase
      .from("quiz_sessions")
      .update({
        status: updateData.status ?? session.status,
        current_question_id: updateData.currentQuestionId,
        current_question_index: updateData.currentQuestionIndex ?? session.currentQuestionIndex,
        question_started_at: updateData.questionStartedAt?.toISOString(),
        started_at: updateData.startedAt?.toISOString(),
        ended_at: updateData.endedAt?.toISOString(),
      })
      .eq("id", sessionId);

    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession.id,
        status: updatedSession.status,
        currentQuestionIndex: updatedSession.currentQuestionIndex,
        currentQuestionId: updatedSession.currentQuestionId,
        questionStartedAt: updatedSession.questionStartedAt?.toISOString(),
      },
      action,
    });
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}

