import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// POST: Join a session as a student
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

    // Verify student role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "student") {
      return NextResponse.json(
        { error: "Only students can join sessions" },
        { status: 403 }
      );
    }

    // Get the session
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          select: { title: true },
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
        { error: "This session has already ended" },
        { status: 400 }
      );
    }

    // Check if already joined
    const existingParticipant = await prisma.sessionParticipant.findUnique({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId: user.id,
        },
      },
    });

    if (existingParticipant) {
      return NextResponse.json({
        success: true,
        message: "Already joined",
        participant: {
          id: existingParticipant.id,
          sessionId: existingParticipant.sessionId,
          score: existingParticipant.sessionScore,
        },
      });
    }

    // Create participant record
    const participant = await prisma.sessionParticipant.create({
      data: {
        sessionId,
        studentId: user.id,
        sessionScore: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
      },
    });

    // Broadcast join event via Supabase realtime
    await supabase.channel(`quiz-session-${sessionId}`).send({
      type: "broadcast",
      event: "participant_join",
      payload: {
        user_id: user.id,
        full_name: profile.full_name,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Joined session",
      participant: {
        id: participant.id,
        sessionId: participant.sessionId,
        score: participant.sessionScore,
      },
      quiz: {
        title: session.quiz.title,
      },
    });
  } catch (error) {
    console.error("Error joining session:", error);
    return NextResponse.json(
      { error: "Failed to join session" },
      { status: 500 }
    );
  }
}

