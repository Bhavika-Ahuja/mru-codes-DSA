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
                department: true,
                section: true,
              },
            },
          },
          orderBy: { sessionScore: "desc" },
        },
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
            difficulty: session.quiz.difficulty,
            timeLimit: session.quiz.timeLimit,
            totalQuestions: session.quiz.questions.length,
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
            timeLimit: session.quiz.timeLimit,
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

    // For participants, return all questions (safe data - no correct answers) and their current question index
    const participant = session.participants.find((p) => p.studentId === user.id);
    const currentQuestionIndex = participant?.currentQuestionIndex ?? 0;
    const questionsAnswered = participant?.questionsAnswered ?? 0;
    const participantScore = participant?.sessionScore ?? 0;

    const allQuestions = session.quiz.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: (q.options as { id: string; text: string }[]).map((o) => ({
        id: o.id,
        text: o.text,
      })),
      orderIndex: q.orderIndex,
      points: q.points,
    }));

    const currentQuestion = allQuestions[currentQuestionIndex] || null;

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        roomCode: session.roomCode,
        status: session.status,
        currentQuestionIndex,
        questionStartedAt: session.questionStartedAt?.toISOString(),
        startedAt: session.startedAt?.toISOString(),
        participantScore,
        quiz: {
          title: session.quiz.title,
          topic: session.quiz.topic,
          difficulty: session.quiz.difficulty,
          timeLimit: session.quiz.timeLimit,
          totalQuestions: session.quiz.questions.length,
          geolocationEnabled: session.quiz.geolocationEnabled,
          questions: allQuestions,
        },
        host: session.host,
        currentQuestion,
        participantCount: session.participants.length,
        questionsAnswered,
      },
      isHost: false,
      isParticipant: true,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      // Check for Prisma errors
      if (error.message.includes("column") || error.message.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Database schema mismatch. Please run database migrations.",
            details: error.message 
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "Failed to fetch session",
          details: error.message 
        },
        { status: 500 }
      );
    }
    
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

    // Update the session in Supabase for realtime triggers (optional - only if Supabase table exists)
    try {
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
    } catch (supabaseError) {
      // Supabase update is optional for realtime - log but don't fail
      console.warn("Failed to update Supabase for realtime (non-critical):", supabaseError);
    }

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

