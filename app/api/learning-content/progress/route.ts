import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateProgressSchema = z.object({
  contentId: z.string().uuid(),
  isCompleted: z.boolean(),
});

// POST: Update student progress on learning content
export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "student") {
      return NextResponse.json(
        { error: "Only students can update their progress" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = updateProgressSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { contentId, isCompleted } = validationResult.data;

    // Verify content exists
    const content = await prisma.learningContent.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    // Upsert progress record
    let progress;
    try {
      progress = await prisma.contentProgress.upsert({
        where: {
          contentId_studentId: {
            contentId,
            studentId: profile.id,
          },
        },
        update: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          viewedAt: new Date(),
        },
        create: {
          contentId,
          studentId: profile.id,
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          viewedAt: new Date(),
        },
      });
    } catch (error: any) {
      // If the table doesn't exist, return an error asking to run migrations
      if (error.code === "P2021" || error.message?.includes("does not exist")) {
        return NextResponse.json(
          { error: "Progress tracking table not found. Please run database migrations." },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error("Error updating progress:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}

// GET: Get student progress for a course
export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "student") {
      return NextResponse.json(
        { error: "Only students can view their progress" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    // Get all content for the course
    const courseContent = await prisma.learningContent.findMany({
      where: { courseId },
      select: { id: true },
    });

    const contentIds = courseContent.map((c) => c.id);

    // Get progress for all content items
    let progress: Array<{ contentId: string; isCompleted: boolean }> = [];
    if (contentIds.length > 0) {
      try {
        progress = await prisma.contentProgress.findMany({
          where: {
            contentId: { in: contentIds },
            studentId: profile.id,
          },
        });
      } catch (error) {
        // If the table doesn't exist yet, return empty progress
        console.warn("Progress tracking not available yet:", error);
        progress = [];
      }
    }

    // Create a map for easy lookup
    const progressMap = new Map(
      progress.map((p) => [p.contentId, p])
    );

    return NextResponse.json({
      success: true,
      progress: progressMap,
      stats: {
        total: contentIds.length,
        completed: progress.filter((p) => p.isCompleted).length,
        viewed: progress.length,
      },
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}
