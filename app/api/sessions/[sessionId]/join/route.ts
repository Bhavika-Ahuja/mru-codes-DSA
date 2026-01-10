import { NextResponse } from "next/server";
import { getProfile, createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// POST: Join a session as a student
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify student role
    if (profile.role !== "student") {
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
          studentId: profile.id,
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
        studentId: profile.id,
        sessionScore: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
      },
    });

    // Broadcast join event via Supabase realtime
    const supabase = await createClient();
    await supabase.channel(`quiz-session-${sessionId}`).send({
      type: "broadcast",
      event: "participant_join",
      payload: {
        user_id: profile.id,
        full_name: profile.fullName,
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

