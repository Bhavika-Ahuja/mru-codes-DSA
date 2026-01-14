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
          select: {
            title: true,
            geolocationEnabled: true,
            totalQuestions: true,
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

    // Only block joining if session is completed
    // Allow joining during "waiting" and "live" statuses
    if (session.status === "completed") {
      return NextResponse.json(
        { error: "This session has already ended" },
        { status: 400 }
      );
    }

    // Check geolocation if enabled
    if (session.quiz.geolocationEnabled) {
      let body: { latitude?: number; longitude?: number } = {};
      try {
        const text = await request.text();
        if (text) {
          body = JSON.parse(text);
        }
      } catch (parseError) {
        // If body parsing fails, treat as no location provided
        console.warn("Failed to parse request body:", parseError);
      }
      
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
      // If student has already completed this quiz (answered all questions),
      // block re-joining the same session
      if (
        typeof existingParticipant.questionsAnswered === "number" &&
        typeof session.quiz.totalQuestions === "number" &&
        existingParticipant.questionsAnswered >= session.quiz.totalQuestions
      ) {
        return NextResponse.json(
          {
            error: "You have already completed this quiz and cannot join it again.",
            alreadyCompleted: true,
          },
          { status: 403 }
        );
      }

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
    // If quiz is live, start from the current question index, otherwise start from 0
    const startingQuestionIndex = session.status === "live" 
      ? session.currentQuestionIndex 
      : 0;

    const participant = await prisma.sessionParticipant.create({
      data: {
        sessionId,
        studentId: profile.id,
        sessionScore: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
        currentQuestionIndex: startingQuestionIndex,
      },
    });

    // Broadcast join event via Supabase realtime (non-blocking)
    try {
      const supabase = await createClient();
      const channel = supabase.channel(`quiz-session-${sessionId}`);
      await channel.subscribe();
      await (channel.httpSend as (
        event: string,
        payload: Record<string, unknown>
      ) => Promise<unknown>)(
        "participant_join",
        {
          user_id: profile.id,
          full_name: profile.fullName,
        }
      );
    } catch (broadcastError) {
      // Log but don't fail the join operation if broadcast fails
      console.warn("Failed to broadcast join event (non-critical):", broadcastError);
    }

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
    const errorMessage = error instanceof Error ? error.message : "Failed to join session";
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

