import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// DELETE: Delete learning content
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can delete learning content" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Get the content to verify ownership
    const content = await prisma.learningContent.findUnique({
      where: { id },
      include: {
        course: true,
      },
    });

    if (!content) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    // Verify the teacher created this content (or allow any teacher to delete)
    // For now, allow any teacher to delete any content
    // You can add ownership check: if (content.createdById !== profile.id) { ... }

    // Delete the content (cascade will handle progress records)
    await prisma.learningContent.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Content deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting learning content:", error);
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 }
    );
  }
}
