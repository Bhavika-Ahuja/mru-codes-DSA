import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  subject: z.string().min(1),
  year: z.number().int().optional(),
  semester: z.string().optional(),
  fileUrl: z.string().min(1),
  fileName: z.string().min(1),
});

// GET: List exam papers (teachers: all they created, students: all)
export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const examPapers = await prisma.examPaper.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    return NextResponse.json({ success: true, examPapers });
  } catch (error) {
    console.error("Error listing exam papers:", error);
    return NextResponse.json(
      { error: "Failed to fetch exam papers" },
      { status: 500 }
    );
  }
}

// POST: Create exam paper (teacher only)
export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can add exam papers" },
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

    const examPaper = await prisma.examPaper.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        subject: parsed.data.subject,
        year: parsed.data.year ?? null,
        semester: parsed.data.semester ?? null,
        fileUrl: parsed.data.fileUrl,
        fileName: parsed.data.fileName,
        createdById: profile.id,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    return NextResponse.json({ success: true, examPaper });
  } catch (error) {
    console.error("Error creating exam paper:", error);
    return NextResponse.json(
      { error: "Failed to create exam paper" },
      { status: 500 }
    );
  }
}
