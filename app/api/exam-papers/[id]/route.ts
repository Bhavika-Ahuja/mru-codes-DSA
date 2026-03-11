import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// DELETE: Delete exam paper (teacher only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can delete exam papers" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const paper = await prisma.examPaper.findUnique({ where: { id } });
    if (!paper) {
      return NextResponse.json({ error: "Exam paper not found" }, { status: 404 });
    }

    await prisma.examPaper.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Exam paper deleted" });
  } catch (error) {
    console.error("Error deleting exam paper:", error);
    return NextResponse.json(
      { error: "Failed to delete exam paper" },
      { status: 500 }
    );
  }
}
