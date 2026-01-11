import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";

// GET /api/analytics/export - Export analytics data to Excel
export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    
    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const section = searchParams.get("section");
    const studentId = searchParams.get("studentId");
    const reportType = searchParams.get("type") || "all"; // all, quizzes, assignments, performance

    // Get all students
    const studentsQuery: Prisma.ProfileWhereInput = {
      role: "student",
      ...(section && section !== "all" ? { section } : {}),
      ...(studentId && studentId !== "all" ? { id: studentId } : {}),
    };

    const students = await prisma.profile.findMany({
      where: studentsQuery,
      select: {
        id: true,
        fullName: true,
        email: true,
        rollNumber: true,
        section: true,
        totalScore: true,
        quizzesTaken: true,
      },
      orderBy: { totalScore: "desc" },
    });

    const workbook = XLSX.utils.book_new();

    // 1. Student Overview Sheet
    if (reportType === "all" || reportType === "performance") {
      const overviewData = students.map((student, index) => ({
        "Rank": index + 1,
        "Student Name": student.fullName,
        "Email": student.email,
        "Roll Number": student.rollNumber || "-",
        "Section": student.section || "-",
        "Total Score": student.totalScore,
        "Quizzes Taken": student.quizzesTaken,
      }));

      const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(workbook, overviewSheet, "Student Overview");
    }

    // 2. Quiz Participation Sheet
    if (reportType === "all" || reportType === "quizzes") {
      const quizData: Array<{
        "Student Name": string;
        "Email": string;
        "Section": string;
        "Quiz Title": string;
        "Topic": string;
        "Score": number;
        "Accuracy %": number;
        "Questions Answered": number;
        "Correct Answers": number;
        "Date Joined": string;
      }> = [];

      for (const student of students) {
        const participations = await prisma.sessionParticipant.findMany({
          where: { studentId: student.id },
          include: {
            session: {
              include: {
                quiz: {
                  select: {
                    title: true,
                    topic: true,
                  },
                },
              },
            },
          },
          orderBy: { joinedAt: "desc" },
        });

        participations.forEach((participation) => {
          const accuracy =
            participation.questionsAnswered > 0
              ? (participation.correctAnswers / participation.questionsAnswered) * 100
              : 0;

          quizData.push({
            "Student Name": student.fullName,
            "Email": student.email,
            "Section": student.section || "-",
            "Quiz Title": participation.session.quiz.title,
            "Topic": participation.session.quiz.topic,
            "Score": participation.sessionScore,
            "Accuracy %": Math.round(accuracy * 100) / 100,
            "Questions Answered": participation.questionsAnswered,
            "Correct Answers": participation.correctAnswers,
            "Date Joined": participation.joinedAt.toISOString().split("T")[0],
          });
        });
      }

      if (quizData.length > 0) {
        const quizSheet = XLSX.utils.json_to_sheet(quizData);
        XLSX.utils.book_append_sheet(workbook, quizSheet, "Quiz Participation");
      }
    }

    // 3. Assignment Submissions Sheet
    if (reportType === "all" || reportType === "assignments") {
      const assignmentData: Array<{
        "Student Name": string;
        "Email": string;
        "Section": string;
        "Assignment Title": string;
        "Topic": string;
        "Grade": number | string;
        "Max Points": number;
        "Percentage": number | string;
        "Status": string;
        "Submitted At": string;
        "Graded At": string;
      }> = [];

      for (const student of students) {
        const assignments = await prisma.assignmentSubmission.findMany({
          where: { studentId: student.id },
          include: {
            assignment: {
              select: {
                title: true,
                maxPoints: true,
                topic: true,
              },
            },
          },
          orderBy: { submittedAt: "desc" },
        });

        assignments.forEach((assignment) => {
          const percentage =
            assignment.grade !== null && assignment.assignment.maxPoints > 0
              ? (assignment.grade / assignment.assignment.maxPoints) * 100
              : null;

          assignmentData.push({
            "Student Name": student.fullName,
            "Email": student.email,
            "Section": student.section || "-",
            "Assignment Title": assignment.assignment.title,
            "Topic": assignment.assignment.topic || "-",
            "Grade": assignment.grade !== null ? assignment.grade : "Pending",
            "Max Points": assignment.assignment.maxPoints,
            "Percentage": percentage !== null ? `${percentage.toFixed(1)}%` : "Pending",
            "Status": assignment.status,
            "Submitted At": assignment.submittedAt.toISOString().split("T")[0],
            "Graded At": assignment.gradedAt
              ? assignment.gradedAt.toISOString().split("T")[0]
              : "Not Graded",
          });
        });
      }

      if (assignmentData.length > 0) {
        const assignmentSheet = XLSX.utils.json_to_sheet(assignmentData);
        XLSX.utils.book_append_sheet(workbook, assignmentSheet, "Assignment Submissions");
      }
    }

    // 4. Performance Summary Sheet
    if (reportType === "all" || reportType === "performance") {
      const performanceData: Array<{
        "Student Name": string;
        "Email": string;
        "Section": string;
        "Total Sessions": number;
        "Average Score": number;
        "Average Accuracy %": number;
        "Total Points": number;
        "Quizzes Taken": number;
      }> = [];

      for (const student of students) {
        const participations = await prisma.sessionParticipant.findMany({
          where: { studentId: student.id },
        });

        const totalSessions = participations.length;
        const avgScore =
          totalSessions > 0
            ? participations.reduce((sum, p) => sum + p.sessionScore, 0) / totalSessions
            : 0;
        const avgAccuracy =
          totalSessions > 0
            ? participations.reduce(
                (sum, p) =>
                  sum + (p.questionsAnswered > 0
                    ? (p.correctAnswers / p.questionsAnswered) * 100
                    : 0),
                0
              ) / totalSessions
            : 0;

        performanceData.push({
          "Student Name": student.fullName,
          "Email": student.email,
          "Section": student.section || "-",
          "Total Sessions": totalSessions,
          "Average Score": Math.round(avgScore * 100) / 100,
          "Average Accuracy %": Math.round(avgAccuracy * 100) / 100,
          "Total Points": student.totalScore,
          "Quizzes Taken": student.quizzesTaken,
        });
      }

      if (performanceData.length > 0) {
        const performanceSheet = XLSX.utils.json_to_sheet(performanceData);
        XLSX.utils.book_append_sheet(workbook, performanceSheet, "Performance Summary");
      }
    }

    // 5. Section Summary Sheet
    if (reportType === "all" || reportType === "performance") {
      const sections = await prisma.profile.findMany({
        where: { role: "student", section: { not: null } },
        select: { section: true },
        distinct: ["section"],
      });

      const sectionSummaryData: Array<{
        "Section": string;
        "Total Students": number;
        "Average Score": number;
        "Average Accuracy %": number;
        "Total Sessions": number;
      }> = [];

      for (const sec of sections) {
        if (!sec.section) continue;

        const secStudents = await prisma.profile.findMany({
          where: { role: "student", section: sec.section },
          select: { id: true },
        });

        const secParticipations = await prisma.sessionParticipant.findMany({
          where: {
            studentId: { in: secStudents.map((s) => s.id) },
          },
        });

        const avgScore =
          secParticipations.length > 0
            ? secParticipations.reduce((sum, p) => sum + p.sessionScore, 0) /
              secParticipations.length
            : 0;

        const avgAccuracy =
          secParticipations.length > 0
            ? secParticipations.reduce(
                (sum, p) =>
                  sum + (p.questionsAnswered > 0
                    ? (p.correctAnswers / p.questionsAnswered) * 100
                    : 0),
                0
              ) / secParticipations.length
            : 0;

        sectionSummaryData.push({
          "Section": sec.section,
          "Total Students": secStudents.length,
          "Average Score": Math.round(avgScore * 100) / 100,
          "Average Accuracy %": Math.round(avgAccuracy * 100) / 100,
          "Total Sessions": secParticipations.length,
        });
      }

      if (sectionSummaryData.length > 0) {
        const sectionSheet = XLSX.utils.json_to_sheet(sectionSummaryData);
        XLSX.utils.book_append_sheet(workbook, sectionSheet, "Section Summary");
      }
    }

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `analytics-report-${timestamp}.xlsx`;

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting analytics:", error);
    return NextResponse.json(
      { error: "Failed to export analytics" },
      { status: 500 }
    );
  }
}
