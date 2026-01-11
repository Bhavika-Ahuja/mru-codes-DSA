import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// Generate a random 6-character room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST: Restart a session (delete current session and create a new one)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can restart sessions" },
        { status: 403 }
      );
    }

    const { sessionId } = await params;

    // Get the current session and verify ownership
    const currentSession = await prisma.quizSession.findUnique({
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

    if (!currentSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (currentSession.hostId !== profile.id) {
      return NextResponse.json(
        { error: "Only the host can restart this session" },
        { status: 403 }
      );
    }

    if (currentSession.quiz.questions.length === 0) {
      return NextResponse.json(
        { error: "Quiz has no questions" },
        { status: 400 }
      );
    }

    const quizId = currentSession.quizId;

    // Delete the current session and all related data (cascade will handle participants and submissions)
    await prisma.quizSession.delete({
      where: { id: sessionId },
    });

    // Generate unique room code for new session
    let roomCode = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.quizSession.findUnique({
        where: { roomCode },
      });
      if (!existing) break;
      roomCode = generateRoomCode();
      attempts++;
    }

    // Create a new session in waiting state
    const newSession = await prisma.quizSession.create({
      data: {
        quizId,
        hostId: profile.id,
        roomCode,
        status: "waiting",
        currentQuestionIndex: 0,
      },
    });

    return NextResponse.json({
      success: true,
      session: {
        id: newSession.id,
        roomCode: newSession.roomCode,
        status: newSession.status,
      },
      quiz: {
        id: currentSession.quiz.id,
        title: currentSession.quiz.title,
        questionCount: currentSession.quiz.questions.length,
      },
    });
  } catch (error) {
    console.error("Error restarting session:", error);
    return NextResponse.json(
      {
        error: "Failed to restart session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
