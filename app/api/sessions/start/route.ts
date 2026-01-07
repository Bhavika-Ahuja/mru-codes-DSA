import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Generate a random 6-character room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const startSessionSchema = z.object({
  quizId: z.string().uuid(),
});

// POST: Start a new session for a quiz (creates session and returns it)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify teacher role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can start sessions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = startSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { quizId } = validation.data;

    // Verify the quiz exists, belongs to this teacher, and has questions
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        createdById: user.id,
      },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found or unauthorized" },
        { status: 404 }
      );
    }

    if (quiz.questions.length === 0) {
      return NextResponse.json(
        { error: "Quiz has no questions" },
        { status: 400 }
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

    // Create the session in waiting state
    const session = await prisma.quizSession.create({
      data: {
        quizId,
        hostId: user.id,
        roomCode,
        status: "waiting",
        currentQuestionIndex: 0,
      },
    });

    // Update quiz status to published if draft
    if (quiz.status === "draft") {
      await prisma.quiz.update({
        where: { id: quizId },
        data: { status: "published" },
      });
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        roomCode: session.roomCode,
        status: session.status,
      },
      quiz: {
        id: quiz.id,
        title: quiz.title,
        questionCount: quiz.questions.length,
      },
    });
  } catch (error) {
    console.error("Error starting session:", error);
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    );
  }
}

