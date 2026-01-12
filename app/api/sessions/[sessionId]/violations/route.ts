import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const violationSchema = z.object({
  violationCount: z.number().int().min(0),
  timestamp: z.string(),
});

// POST: Record anti-cheating violations
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

    const body = await request.json();
    const validation = violationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { violationCount, timestamp } = validation.data;

    // Get session participant
    const participant = await prisma.sessionParticipant.findFirst({
      where: {
        sessionId,
        studentId: user.id,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Log violation (you could store this in a separate violations table)
    // For now, we'll just acknowledge receipt
    // In production, you might want to:
    // 1. Store violations in a database table
    // 2. Send alerts to teacher
    // 3. Auto-submit quiz if violations exceed threshold

    console.log(
      `Violation reported: Session ${sessionId}, User ${user.id}, Count: ${violationCount}, Time: ${timestamp}`
    );

    return NextResponse.json({
      success: true,
      message: "Violation recorded",
    });
  } catch (error) {
    console.error("Error recording violation:", error);
    return NextResponse.json(
      {
        error: "Failed to record violation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
