import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// GET: Get quiz results grouped by section
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can view quiz results" },
        { status: 403 }
      );
    }

    const { id: quizId } = await params;

    // Get the quiz
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
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

    // Get all completed sessions for this quiz
    const sessions = await prisma.quizSession.findMany({
      where: {
        quizId,
        status: "completed",
      },
      include: {
        participants: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                rollNumber: true,
                section: true,
                department: true,
                email: true,
              },
            },
          },
        },
        submissions: {
          include: {
            question: {
              select: {
                id: true,
                orderIndex: true,
                points: true,
              },
            },
          },
        },
      },
    });

    // Group results by section
    const resultsBySection: Record<
      string,
      {
        section: string;
        department: string | null;
        students: Array<{
          studentId: string;
          fullName: string;
          rollNumber: string | null;
          email: string;
          sessionId: string;
          sessionScore: number;
          questionsAnswered: number;
          correctAnswers: number;
          totalQuestions: number;
          marks: number; // Marks out of total questions (1 mark per correct answer)
          accuracy: number;
          completedAt: string | null;
          questionDetails: Array<{
            questionId: string;
            orderIndex: number;
            isCorrect: boolean;
            score: number;
            submittedAt: string;
          }>;
        }>;
      }
    > = {};

    // Process each session
    for (const session of sessions) {
      for (const participant of session.participants) {
        const student = participant.student;
        const sectionKey = student.section || "No Section";
        const department = student.department || null;

        // Get all submissions for this student in this session
        const studentSubmissions = session.submissions.filter(
          (s) => s.studentId === student.id
        );

        // Calculate marks (1 mark per correct answer)
        const marks = studentSubmissions.filter((s) => s.isCorrect).length;
        const totalQuestions = quiz.totalQuestions;
        const accuracy =
          studentSubmissions.length > 0
            ? (marks / studentSubmissions.length) * 100
            : 0;

        // Get question details
        const questionDetails = studentSubmissions.map((sub) => ({
          questionId: sub.questionId,
          orderIndex: sub.question.orderIndex,
          isCorrect: sub.isCorrect,
          score: sub.isCorrect ? 1 : 0, // Normalize to 1 mark per question
          submittedAt: sub.submittedAt.toISOString(),
        }));

        if (!resultsBySection[sectionKey]) {
          resultsBySection[sectionKey] = {
            section: sectionKey,
            department,
            students: [],
          };
        }

        resultsBySection[sectionKey].students.push({
          studentId: student.id,
          fullName: student.fullName,
          rollNumber: student.rollNumber,
          email: student.email,
          sessionId: session.id,
          sessionScore: participant.sessionScore,
          questionsAnswered: participant.questionsAnswered,
          correctAnswers: participant.correctAnswers,
          totalQuestions,
          marks, // Marks based on correct answers (1 mark each)
          accuracy: Math.round(accuracy * 100) / 100,
          completedAt: session.endedAt?.toISOString() || null,
          questionDetails: questionDetails.sort(
            (a, b) => a.orderIndex - b.orderIndex
          ),
        });
      }
    }

    // Sort students within each section by marks (descending)
    for (const sectionKey in resultsBySection) {
      resultsBySection[sectionKey].students.sort(
        (a, b) => b.marks - a.marks
      );
    }

    // Convert to array and sort sections
    const sections = Object.values(resultsBySection).sort((a, b) => {
      if (a.department !== b.department) {
        return (a.department || "").localeCompare(b.department || "");
      }
      return a.section.localeCompare(b.section);
    });

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        totalQuestions: quiz.totalQuestions,
      },
      sections,
      summary: {
        totalSessions: sessions.length,
        totalStudents: Object.values(resultsBySection).reduce(
          (sum, section) => sum + section.students.length,
          0
        ),
        totalSections: sections.length,
        averageMarks:
          sections.reduce(
            (sum, section) =>
              sum +
              section.students.reduce((s, student) => s + student.marks, 0),
            0
          ) /
          sections.reduce((sum, section) => sum + section.students.length, 0) ||
          0,
      },
    });
  } catch (error) {
    console.error("Error fetching quiz results:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz results" },
      { status: 500 }
    );
  }
}
