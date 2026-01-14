import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// GET: Get student's submissions for a session
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

    // Verify user is a participant
    const participant = await prisma.sessionParticipant.findUnique({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId: user.id,
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "You are not a participant in this session" },
        { status: 403 }
      );
    }

    // Get all submissions for this student in this session
    const submissions = await prisma.submission.findMany({
      where: {
        sessionId,
        studentId: user.id,
      },
      select: {
        questionId: true,
        selectedOptionId: true,
      },
    });

    return NextResponse.json({
      success: true,
      submissions: submissions.map((s) => ({
        questionId: s.questionId,
        selectedOptionId: s.selectedOptionId,
      })),
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
