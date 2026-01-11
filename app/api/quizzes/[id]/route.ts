import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET /api/quizzes/[id] - Get quiz by ID with questions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    // Teachers can only see their own quizzes
    if (profile.role === "teacher" && quiz.createdById !== profile.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        timeLimit: quiz.timeLimit,
        geolocationEnabled: quiz.geolocationEnabled,
        status: quiz.status,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          points: q.points,
          timeLimit: q.timeLimit,
          orderIndex: q.orderIndex,
          options: q.options,
          codeTemplate: q.codeTemplate,
          explanation: q.explanation,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}

// DELETE /api/quizzes/[id] - Delete a quiz
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can delete quizzes" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if quiz exists and belongs to the teacher
    const quiz = await prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    if (quiz.createdById !== profile.id) {
      return NextResponse.json(
        { error: "You can only delete your own quizzes" },
        { status: 403 }
      );
    }

    // Check if there are any active sessions for this quiz
    const activeSessions = await prisma.quizSession.count({
      where: {
        quizId: id,
        status: "live",
      },
    });

    if (activeSessions > 0) {
      return NextResponse.json(
        { error: "Cannot delete quiz with active sessions. Please end all sessions first." },
        { status: 400 }
      );
    }

    // Delete the quiz (cascade will delete questions and sessions)
    await prisma.quiz.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    return NextResponse.json(
      { error: "Failed to delete quiz" },
      { status: 500 }
    );
  }
}
