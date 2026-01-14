import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const addTimeSchema = z.object({
  seconds: z.number().int().min(60).max(600), // Allow adding 1-10 minutes
});

// POST: Add time to a live session
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

    // Get session and verify host
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: true,
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
        { error: "Only the host can add time to this session" },
        { status: 403 }
      );
    }

    if (session.status !== "live") {
      return NextResponse.json(
        { error: "Can only add time to live sessions" },
        { status: 400 }
      );
    }

    if (!session.startedAt) {
      return NextResponse.json(
        { error: "Session has not started yet" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = addTimeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { seconds } = validation.data;

    // Add time by moving startedAt later (reducing elapsed time, increasing remaining time)
    const newStartedAt = new Date(session.startedAt.getTime() + seconds * 1000);

    // Update the session
    const updatedSession = await prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        startedAt: newStartedAt,
      },
    });

    // Broadcast the time extension to all participants
    try {
      const channel = supabase.channel(`quiz-session-${sessionId}`);
      await channel.subscribe();
      await (channel.httpSend as (
        event: string,
        payload: Record<string, unknown>
      ) => Promise<unknown>)(
        "time_extended",
        {
          seconds_added: seconds,
          new_started_at: newStartedAt.toISOString(),
        }
      );
    } catch (broadcastError) {
      console.warn("Failed to broadcast time extension (non-critical):", broadcastError);
    }

    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession.id,
        startedAt: updatedSession.startedAt?.toISOString(),
      },
      secondsAdded: seconds,
    });
  } catch (error) {
    console.error("Error adding time to session:", error);
    return NextResponse.json(
      {
        error: "Failed to add time to session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
