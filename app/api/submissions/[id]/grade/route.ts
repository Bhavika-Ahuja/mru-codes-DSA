import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/submissions/[id]/grade - Grade a submission (teacher only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await getProfile();
    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id },
      include: {
        assignment: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Verify the teacher created the assignment
    if (submission.assignment.createdById !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { grade, feedback, status } = body;

    if (grade !== undefined) {
      // Validate grade is within bounds
      if (grade < 0 || grade > submission.assignment.maxPoints) {
        return NextResponse.json(
          { error: `Grade must be between 0 and ${submission.assignment.maxPoints}` },
          { status: 400 }
        );
      }
    }

    const updatedSubmission = await prisma.assignmentSubmission.update({
      where: { id },
      data: {
        ...(grade !== undefined && { grade }),
        ...(feedback !== undefined && { feedback }),
        ...(status !== undefined && { status }),
        gradedAt: new Date(),
        gradedById: profile.id,
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            rollNumber: true,
            section: true,
          },
        },
        assignment: {
          select: {
            title: true,
            maxPoints: true,
          },
        },
      },
    });

    return NextResponse.json({ submission: updatedSubmission });
  } catch (error) {
    console.error("Error grading submission:", error);
    return NextResponse.json(
      { error: "Failed to grade submission" },
      { status: 500 }
    );
  }
}
