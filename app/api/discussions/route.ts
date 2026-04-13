import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { departmentRequiresSection, type Department } from "@/lib/departments";

function buildStudentScope(profile: { department: string | null; section: string | null }) {
  const department = profile.department?.trim() || null;
  const section = profile.section?.trim() || null;

  return {
    OR: [
      { targetDepartment: null },
      ...(department
        ? [
            {
              targetDepartment: department,
              OR: [{ targetSection: null }, ...(section ? [{ targetSection: section }] : [])],
            },
          ]
        : []),
    ],
  };
}

export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const department = searchParams.get("department")?.trim() || null;
    const section = searchParams.get("section")?.trim() || null;

    const threads = await prisma.discussionThread.findMany({
      where:
        profile.role === "student"
          ? buildStudentScope(profile)
          : {
              ...(department ? { targetDepartment: department } : {}),
              ...(section ? { targetSection: section } : {}),
            },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            role: true,
            department: true,
            section: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({ threads });
  } catch (error) {
    console.error("Error fetching discussions:", error);
    return NextResponse.json(
      { error: "Failed to fetch discussion threads" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const requestedDepartment =
      typeof body.targetDepartment === "string" ? body.targetDepartment.trim() : "";
    const requestedSection =
      typeof body.targetSection === "string" ? body.targetSection.trim() : "";

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const targetDepartment =
      profile.role === "student"
        ? profile.department?.trim() || null
        : requestedDepartment || null;
    const targetSection =
      profile.role === "student"
        ? profile.section?.trim() || null
        : requestedSection || null;

    if (profile.role === "student" && !targetDepartment) {
      return NextResponse.json(
        { error: "Your profile does not have a department configured" },
        { status: 400 }
      );
    }

    if (
      targetDepartment &&
      departmentRequiresSection(targetDepartment as Department) &&
      !targetSection
    ) {
      return NextResponse.json(
        { error: "Section is required for the selected department" },
        { status: 400 }
      );
    }

    const thread = await prisma.discussionThread.create({
      data: {
        title,
        content,
        createdById: profile.id,
        targetDepartment,
        targetSection:
          targetDepartment && departmentRequiresSection(targetDepartment as Department)
            ? targetSection
            : null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            role: true,
            department: true,
            section: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    console.error("Error creating discussion:", error);
    return NextResponse.json(
      { error: "Failed to create discussion thread" },
      { status: 500 }
    );
  }
}
