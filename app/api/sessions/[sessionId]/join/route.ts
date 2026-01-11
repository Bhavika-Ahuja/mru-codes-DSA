import { NextResponse } from "next/server";
import { getProfile, createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { isWithinCampus } from "@/lib/geolocation";

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

    // Get the session with quiz details
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          select: { title: true, geolocationEnabled: true },
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

    // Check geolocation if enabled
    if (session.quiz.geolocationEnabled) {
      const body = await request.json().catch(() => ({}));
      const { latitude, longitude } = body;

      if (!latitude || !longitude) {
        return NextResponse.json(
          { 
            error: "Location required", 
            requiresLocation: true,
            message: "This quiz requires you to be on campus. Please enable location access."
          },
          { status: 400 }
        );
      }

      if (!isWithinCampus(latitude, longitude)) {
        return NextResponse.json(
          { 
            error: "Location not within campus",
            message: "You must be on Manav Rachna University campus to join this quiz."
          },
          { status: 403 }
        );
      }
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

