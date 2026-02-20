import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// GET: Get all content for a specific course
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: courseId } = await params;

    // Get course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Students can only see published courses
    if (profile.role === "student" && course.status !== "published") {
      return NextResponse.json(
        { error: "Course not available" },
        { status: 403 }
      );
    }

    // Get all content for this course
    const content = await prisma.learningContent.findMany({
      where: { courseId },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        slug: course.slug,
        icon: course.icon,
      },
      content,
    });
  } catch (error) {
    console.error("Error fetching course content:", error);
    return NextResponse.json(
      { error: "Failed to fetch course content" },
      { status: 500 }
    );
  }
}
