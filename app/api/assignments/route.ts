import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AssignmentStatus } from "@prisma/client";
import { departmentRequiresSection, type Department } from "@/lib/departments";

// GET /api/assignments - Get all assignments (for teachers) or published assignments (for students)
export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const forStudent = searchParams.get("forStudent") === "true";

    if (forStudent || profile.role === "student") {
      const studentDepartment = profile.department?.trim() || null;
      const studentSection = profile.section?.trim() || null;

      // Students can only see published assignments
      const assignments = await prisma.assignment.findMany({
        where: {
          status: (status as AssignmentStatus) || "published",
          OR: [
            {
              targetDepartment: null,
            },
            ...(studentDepartment
              ? [
                  {
                    targetDepartment: studentDepartment,
                    OR: [
                      { targetSection: null },
                      ...(studentSection ? [{ targetSection: studentSection }] : []),
                    ],
                  },
                ]
              : []),
          ],
        },
        include: {
          createdBy: {
            select: {
              fullName: true,
              email: true,
            },
          },
          submissions: {
            where: {
              studentId: profile.id,
            },
            select: {
              id: true,
              status: true,
              submittedAt: true,
            },
          },
          _count: {
            select: {
              submissions: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({ assignments });
    } else if (profile.role === "teacher") {
      // Teachers can see their own assignments
      const assignments = await prisma.assignment.findMany({
        where: {
          createdById: profile.id,
          ...(status ? { status: status as AssignmentStatus } : {}),
        },
        include: {
          _count: {
            select: {
              submissions: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({ assignments });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

// POST /api/assignments - Create a new assignment (teacher only)
export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      topic,
      difficulty,
      maxPoints,
      dueDate,
      pdfUrl,
      pdfFileName,
      status,
      targetDepartment,
      targetSection,
    } = body;

    if (!title || !pdfUrl || !targetDepartment) {
      return NextResponse.json(
        { error: "Title, PDF, and target class are required" },
        { status: 400 }
      );
    }

    const normalizedDepartment =
      typeof targetDepartment === "string" ? targetDepartment.trim() : "";
    const normalizedSection =
      typeof targetSection === "string" && targetSection.trim().length > 0
        ? targetSection.trim()
        : null;

    if (!normalizedDepartment) {
      return NextResponse.json(
        { error: "Target department is required" },
        { status: 400 }
      );
    }

    if (departmentRequiresSection(normalizedDepartment as Department) && !normalizedSection) {
      return NextResponse.json(
        { error: "Target section is required for this department" },
        { status: 400 }
      );
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        topic,
        difficulty: difficulty || "medium",
        maxPoints: maxPoints || 100,
        dueDate: dueDate ? new Date(dueDate) : null,
        targetDepartment: normalizedDepartment,
        targetSection: departmentRequiresSection(normalizedDepartment as Department)
          ? normalizedSection
          : null,
        pdfUrl,
        pdfFileName,
        createdById: profile.id,
        status: status || "draft",
      },
      include: {
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}
