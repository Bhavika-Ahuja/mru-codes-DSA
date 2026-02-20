import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createCourseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  slug: z.string().min(1),
  icon: z.string().optional(),
  orderIndex: z.number().default(0),
});

// POST: Create a course
export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can create courses" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = createCourseSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if slug already exists
    const existingCourse = await prisma.course.findUnique({
      where: { slug: data.slug },
    });

    if (existingCourse) {
      return NextResponse.json(
        { error: "A course with this slug already exists" },
        { status: 409 }
      );
    }

    const course = await prisma.course.create({
      data: {
        title: data.title,
        description: data.description || null,
        slug: data.slug,
        icon: data.icon || null,
        orderIndex: data.orderIndex,
        status: "published",
      },
      include: {
        _count: {
          select: { content: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      course,
    });
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}

// GET: List courses
export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: { status?: "draft" | "published" | "archived" } = {};
    if (status && ["draft", "published", "archived"].includes(status)) {
      where.status = status as "draft" | "published" | "archived";
    }

    // Students only see published courses
    if (profile.role === "student") {
      where.status = "published";
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        _count: {
          select: { content: true },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}
