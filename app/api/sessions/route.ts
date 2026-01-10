import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Generate a random 6-character room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing characters
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Schema for creating a session
const createSessionSchema = z.object({
  quizId: z.string().uuid(),
});

// POST: Create a new quiz session
export async function POST(request: Request) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify teacher role
    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can create sessions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { quizId } = validation.data;

    // Verify the quiz exists and belongs to this teacher
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        createdById: profile.id,
      },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
          take: 1,
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found or unauthorized" },
        { status: 404 }
      );
    }

    // Generate unique room code
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

    // Create the session
    const session = await prisma.quizSession.create({
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
        id: session.id,
        roomCode: session.roomCode,
        status: session.status,
        quizTitle: quiz.title,
      },
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

// GET: Get session by room code (for students to join)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomCode = searchParams.get("roomCode");

    if (!roomCode) {
      return NextResponse.json(
        { error: "Room code is required" },
        { status: 400 }
      );
    }

    const session = await prisma.quizSession.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            topic: true,
            difficulty: true,
            timePerQuestion: true,
            totalQuestions: true,
          },
        },
        host: {
          select: {
            id: true,
            fullName: true,
          },
        },
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.status === "completed") {
      return NextResponse.json(
        { error: "This session has ended" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        roomCode: session.roomCode,
        status: session.status,
        quiz: session.quiz,
        host: session.host,
        participantCount: session._count.participants,
      },
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

