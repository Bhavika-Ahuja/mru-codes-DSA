import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

function hasThreadAccess(
  thread: { targetDepartment: string | null; targetSection: string | null },
  profile: { role: string; department: string | null; section: string | null }
) {
  if (profile.role !== "student") {
    return true;
  }

  if (!thread.targetDepartment) {
    return true;
  }

  const studentDepartment = profile.department?.trim() || null;
  const studentSection = profile.section?.trim() || null;

  if (!studentDepartment || studentDepartment !== thread.targetDepartment) {
    return false;
  }

  if (!thread.targetSection) {
    return true;
  }

  return studentSection === thread.targetSection;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const thread = await prisma.discussionThread.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            role: true,
            avatarUrl: true,
            department: true,
            section: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Discussion thread not found" }, { status: 404 });
    }

    if (!hasThreadAccess(thread, profile)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ thread });
  } catch (error) {
    console.error("Error fetching discussion thread:", error);
    return NextResponse.json(
      { error: "Failed to fetch discussion thread" },
      { status: 500 }
    );
  }
}

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

    const existing = await prisma.discussionThread.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Discussion thread not found" }, { status: 404 });
    }

    const body = await request.json();
    const isPinned = typeof body.isPinned === "boolean" ? body.isPinned : undefined;
    const isClosed = typeof body.isClosed === "boolean" ? body.isClosed : undefined;

    if (isPinned === undefined && isClosed === undefined) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.discussionThread.update({
      where: { id },
      data: {
        ...(isPinned !== undefined && { isPinned }),
        ...(isClosed !== undefined && { isClosed }),
      },
    });

    return NextResponse.json({ thread: updated });
  } catch (error) {
    console.error("Error updating discussion thread:", error);
    return NextResponse.json(
      { error: "Failed to update discussion thread" },
      { status: 500 }
    );
  }
}
