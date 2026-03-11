import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: z.enum(["draft", "scheduled", "live", "ended"]).optional(),
});

// GET: List contests (teacher: all; student: scheduled/live/ended only)
export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (profile.role === "teacher") {
      const contests = await prisma.contest.findMany({
        orderBy: { startAt: "desc" },
        include: {
          _count: { select: { problems: true, submissions: true } },
          createdBy: { select: { fullName: true } },
        },
      });
      return NextResponse.json({ success: true, contests });
    }

    const contests = await prisma.contest.findMany({
      where: { status: { in: ["scheduled", "live", "ended"] } },
      orderBy: { startAt: "desc" },
      include: {
        _count: { select: { problems: true } },
      },
    });
    return NextResponse.json({ success: true, contests });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list contests" }, { status: 500 });
  }
}

// POST: Create contest (teacher)
export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    const contest = await prisma.contest.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        startAt: new Date(parsed.data.startAt),
        endAt: new Date(parsed.data.endAt),
        status: (parsed.data.status as "draft" | "scheduled" | "live" | "ended") ?? "draft",
        createdById: profile.id,
      },
    });
    return NextResponse.json({ success: true, contest });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create contest" }, { status: 500 });
  }
}
