import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  projectUrl: z.string().url(),
  techStack: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
});

// GET: List portfolio projects (students: own only, teachers: all with student info)
export async function GET(_request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role === "teacher") {
      const projects = await prisma.portfolioProject.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              rollNumber: true,
              section: true,
              department: true,
            },
          },
        },
      });
      return NextResponse.json({ success: true, projects });
    }

    const projects = await prisma.portfolioProject.findMany({
      where: { studentId: profile.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error("Error listing portfolio projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST: Add project (student only)
export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (profile.role !== "student") {
      return NextResponse.json(
        { error: "Only students can add portfolio projects" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const project = await prisma.portfolioProject.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        projectUrl: parsed.data.projectUrl,
        techStack: parsed.data.techStack ?? null,
        thumbnailUrl: parsed.data.thumbnailUrl ?? null,
        studentId: profile.id,
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Error creating portfolio project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
