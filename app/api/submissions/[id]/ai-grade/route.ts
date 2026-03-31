import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getProfile } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

function parseJsonResponse(rawText: string) {
  const trimmed = rawText.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(withoutFence) as {
    score: number;
    feedback: string;
    strengths?: string[];
    improvements?: string[];
  };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await getProfile();
    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            description: true,
            topic: true,
            maxPoints: true,
            pdfUrl: true,
            pdfFileName: true,
            createdById: true,
          },
        },
        student: {
          select: {
            fullName: true,
            rollNumber: true,
            department: true,
            section: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.assignment.createdById !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!submission.pdfUrl) {
      return NextResponse.json(
        { error: "Student submission PDF is missing" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const assignmentMeta = [
      `Title: ${submission.assignment.title}`,
      `Topic: ${submission.assignment.topic ?? "Not specified"}`,
      `Description: ${submission.assignment.description ?? "Not specified"}`,
      `Max points: ${submission.assignment.maxPoints}`,
      `Student: ${submission.student.fullName} (${submission.student.rollNumber ?? "No roll"})`,
      `Department/Section: ${submission.student.department ?? "-"} / ${submission.student.section ?? "-"}`,
    ].join("\n");

    const prompt = `You are a strict but fair CS teacher.

You are grading one student's assignment solution out of ${submission.assignment.maxPoints} points.
Use the assignment instructions and expected requirements from the assignment PDF. Then evaluate the student's submitted PDF solution.

Assignment metadata:
${assignmentMeta}

Grading rules:
1) Score must be an integer between 0 and ${submission.assignment.maxPoints}.
2) Prioritize correctness, completeness, algorithm choice, edge-case handling, and clarity.
3) Penalize missing/incorrect logic and unsupported claims.
4) Feedback must be practical and actionable for the student.

Return ONLY valid JSON with this exact shape:
{
  "score": 0,
  "feedback": "short paragraph feedback",
  "strengths": ["point 1", "point 2"],
  "improvements": ["point 1", "point 2"]
}`;

    const contentParts: Array<
      | { text: string }
      | { fileData: { mimeType: string; fileUri: string } }
    > = [{ text: prompt }];

    if (submission.assignment.pdfUrl) {
      contentParts.push({
        fileData: {
          mimeType: "application/pdf",
          fileUri: submission.assignment.pdfUrl,
        },
      });
    }

    contentParts.push({
      fileData: {
        mimeType: "application/pdf",
        fileUri: submission.pdfUrl,
      },
    });

    const result = await model.generateContent(contentParts);
    const raw = result.response.text();
    if (!raw) {
      throw new Error("Empty AI response");
    }

    const parsed = parseJsonResponse(raw);
    const maxPoints = submission.assignment.maxPoints;
    const normalizedScore = Math.max(
      0,
      Math.min(maxPoints, Math.round(Number(parsed.score) || 0))
    );

    const strengthsText =
      parsed.strengths && parsed.strengths.length > 0
        ? `Strengths:\n- ${parsed.strengths.join("\n- ")}`
        : "";
    const improvementsText =
      parsed.improvements && parsed.improvements.length > 0
        ? `Improvements:\n- ${parsed.improvements.join("\n- ")}`
        : "";

    const mergedFeedback = [parsed.feedback, strengthsText, improvementsText]
      .filter(Boolean)
      .join("\n\n");

    const updatedSubmission = await prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        grade: normalizedScore,
        feedback: mergedFeedback,
        status: "graded",
        gradedAt: new Date(),
        gradedById: profile.id,
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            rollNumber: true,
            department: true,
            section: true,
          },
        },
        assignment: {
          select: {
            title: true,
            maxPoints: true,
          },
        },
      },
    });

    return NextResponse.json({
      submission: updatedSubmission,
      aiEvaluation: {
        score: normalizedScore,
      },
    });
  } catch (error) {
    console.error("Error AI grading submission:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to grade submission with AI",
      },
      { status: 500 }
    );
  }
}
