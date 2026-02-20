import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createContentSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  contentType: z.enum(["pdf", "ppt", "video", "document", "other"]),
  contentUrl: z.string().url(), // URL/link to content (Google Drive, YouTube, etc.)
  fileName: z.string().optional(), // Optional: name of the resource
  orderIndex: z.number().default(0),
  duration: z.number().optional(),
  thumbnailUrl: z.string().url().optional(),
});

// POST: Create learning content
export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can create learning content" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = createContentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    const content = await prisma.learningContent.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        description: data.description || null,
        contentType: data.contentType,
        contentUrl: data.contentUrl,
        fileName: data.fileName || null,
        orderIndex: data.orderIndex,
        duration: data.duration || null,
        thumbnailUrl: data.thumbnailUrl || null,
        createdById: profile.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error("Error creating learning content:", error);
    return NextResponse.json(
      { error: "Failed to create learning content" },
      { status: 500 }
    );
  }
}

// GET: List learning content
export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    const where: { courseId?: string } = {};
    if (courseId) {
      where.courseId = courseId;
    }

    const content = await prisma.learningContent.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: [
        { courseId: "asc" },
        { orderIndex: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error("Error fetching learning content:", error);
    return NextResponse.json(
      { error: "Failed to fetch learning content" },
      { status: 500 }
    );
  }
}
