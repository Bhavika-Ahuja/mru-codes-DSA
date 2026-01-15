import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

function toISODate(d: Date) {
  return d.toISOString().split("T")[0];
}

function makeFilename({
  department,
  section,
  type,
}: {
  department: string | null;
  section: string | null;
  type: string;
}) {
  const timestamp = new Date().toISOString().split("T")[0];
  const departmentPart = department && department !== "all" ? `-${department}` : "";
  const sectionPart = section && section !== "all" ? `-${section}` : "";
  const typePart = type !== "all" ? `-${type}` : "";
  return `Performance-Report${departmentPart}${sectionPart}${typePart}-${timestamp}.xlsx`;
}

// GET /api/analytics/export - Export comprehensive analytics data to Excel
export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    
    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const department = searchParams.get("department");
    const section = searchParams.get("section");
    const studentId = searchParams.get("studentId");
    const reportType = searchParams.get("type") || "all"; // all, quizzes, assignments, performance, detailed, violations
    const quizId = searchParams.get("quizId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Get all students
    const studentsQuery: Prisma.ProfileWhereInput = {
      role: "student",
      ...(department && department !== "all" ? { department } : {}),
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
        department: true,
        section: true,
        totalScore: true,
        quizzesTaken: true,
      },
      orderBy: { totalScore: "desc" },
    });

    const workbook = XLSX.utils.book_new();

    // Helper function to set column widths
    const setColumnWidths = (worksheet: XLSX.WorkSheet, widths: number[]) => {
      worksheet["!cols"] = widths.map((w) => ({ wch: w }));
    };

    // Date range filter
    const dateFilter: Prisma.DateTimeFilter | undefined = 
      dateFrom || dateTo
        ? {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          }
        : undefined;

    // ---- New (fast) ExcelJS export path ----
    // The legacy XLSX implementation below does many per-student DB queries and can hang
    // for larger datasets. This path uses batched queries + ExcelJS.
    if ((process.env.EXPORT_ENGINE ?? "exceljs") !== "legacy") {
      const studentIds = students.map((s) => s.id);
      const studentById = new Map(students.map((s) => [s.id, s]));

      const needsParticipations =
        reportType === "all" ||
        reportType === "performance" ||
        reportType === "detailed" ||
        reportType === "quizzes";

      const needsAssignments =
        reportType === "all" ||
        reportType === "assignments" ||
        reportType === "performance" ||
        reportType === "detailed";

      const [participations, assignmentSubmissions] = await Promise.all([
        needsParticipations && studentIds.length > 0
          ? prisma.sessionParticipant.findMany({
              where: {
                studentId: { in: studentIds },
                ...(dateFilter ? { joinedAt: dateFilter } : {}),
                ...(quizId ? { session: { quizId } } : {}),
              },
              include: {
                session: {
                  select: {
                    roomCode: true,
                    status: true,
                    startedAt: true,
                    endedAt: true,
                    quiz: {
                      select: {
                        title: true,
                        topic: true,
                        difficulty: true,
                        totalQuestions: true,
                      },
                    },
                  },
                },
              },
              orderBy: { joinedAt: "desc" },
            })
          : Promise.resolve([]),
        needsAssignments && studentIds.length > 0
          ? prisma.assignmentSubmission.findMany({
              where: {
                studentId: { in: studentIds },
                ...(dateFilter ? { submittedAt: dateFilter } : {}),
              },
              include: {
                assignment: {
                  select: {
                    title: true,
                    maxPoints: true,
                    topic: true,
                    difficulty: true,
                  },
                },
              },
              orderBy: { submittedAt: "desc" },
            })
          : Promise.resolve([]),
      ]);

      const participationsByStudent = new Map<string, typeof participations>();
      for (const p of participations) {
        const arr = participationsByStudent.get(p.studentId) ?? [];
        arr.push(p);
        participationsByStudent.set(p.studentId, arr);
      }

      const assignmentsByStudent = new Map<string, typeof assignmentSubmissions>();
      for (const a of assignmentSubmissions) {
        const arr = assignmentsByStudent.get(a.studentId) ?? [];
        arr.push(a);
        assignmentsByStudent.set(a.studentId, arr);
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "DSA Dashboard";
      workbook.created = new Date();

      const headerStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, color: { argb: "FFFFFFFF" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } },
        alignment: { vertical: "middle", horizontal: "center" },
      };

      const styleHeaderRow = (sheet: ExcelJS.Worksheet) => {
        const row = sheet.getRow(1);
        row.height = 20;
        row.eachCell((cell) => {
          cell.style = { ...(cell.style || {}), ...headerStyle };
        });
      };

      // Summary
      {
        const sheet = workbook.addWorksheet("Report Summary");
        sheet.columns = [
          { header: "Metric", key: "metric", width: 28 },
          { header: "Value", key: "value", width: 60 },
        ];
        sheet.addRow({ metric: "Report Generated", value: new Date().toLocaleString() });
        sheet.addRow({ metric: "Generated By", value: profile.fullName });
        sheet.addRow({ metric: "Total Students", value: students.length });
        sheet.addRow({
          metric: "Filter Applied",
          value:
            [
              department && department !== "all" ? `Department: ${department}` : null,
              section && section !== "all" ? `Section: ${section}` : null,
            ]
              .filter(Boolean)
              .join(" • ") || "All Students",
        });
        sheet.addRow({
          metric: "Date Range",
          value: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : "All Time",
        });
        sheet.addRow({
          metric: "Report Type",
          value: reportType === "all" ? "Comprehensive Report" : reportType,
        });
        styleHeaderRow(sheet);
      }

      // Student Overview + Performance Summary (performance/detailed/all)
      if (reportType === "all" || reportType === "performance" || reportType === "detailed") {
        const overview = workbook.addWorksheet("Student Overview");
        overview.columns = [
          { header: "Rank", key: "rank", width: 8 },
          { header: "Student Name", key: "name", width: 24 },
          { header: "Email", key: "email", width: 30 },
          { header: "Roll Number", key: "roll", width: 14 },
          { header: "Department", key: "dept", width: 16 },
          { header: "Section", key: "sec", width: 10 },
          { header: "Total Score", key: "totalScore", width: 12 },
          { header: "Quizzes Taken", key: "quizzesTaken", width: 12 },
          { header: "Average Score", key: "avgScore", width: 14 },
          { header: "Performance Grade", key: "grade", width: 18 },
        ];

        const perf = workbook.addWorksheet("Performance Summary");
        perf.columns = [
          { header: "Student Name", key: "name", width: 24 },
          { header: "Email", key: "email", width: 30 },
          { header: "Department", key: "dept", width: 16 },
          { header: "Section", key: "sec", width: 10 },
          { header: "Total Sessions", key: "sessions", width: 14 },
          { header: "Avg Score", key: "avgScore", width: 12 },
          { header: "Avg Accuracy %", key: "avgAcc", width: 14 },
          { header: "Assignments Submitted", key: "asSub", width: 18 },
          { header: "Assignments Graded", key: "asGr", width: 16 },
        ];

        students.forEach((student, idx) => {
          const ps = participationsByStudent.get(student.id) ?? [];
          const as = assignmentsByStudent.get(student.id) ?? [];

          const avgScore = ps.length > 0 ? ps.reduce((s, p) => s + p.sessionScore, 0) / ps.length : 0;
          const avgAcc =
            ps.length > 0
              ? ps.reduce((s, p) => s + (p.questionsAnswered > 0 ? (p.correctAnswers / p.questionsAnswered) * 100 : 0), 0) /
                ps.length
              : 0;

          const grade =
            student.totalScore >= 1000
              ? "Excellent"
              : student.totalScore >= 500
              ? "Good"
              : student.totalScore >= 200
              ? "Average"
              : "Needs Improvement";

          overview.addRow({
            rank: idx + 1,
            name: student.fullName,
            email: student.email,
            roll: student.rollNumber || "-",
            dept: student.department || "-",
            sec: student.section || "-",
            totalScore: student.totalScore,
            quizzesTaken: student.quizzesTaken,
            avgScore: Math.round(avgScore * 100) / 100,
            grade,
          });

          perf.addRow({
            name: student.fullName,
            email: student.email,
            dept: student.department || "-",
            sec: student.section || "-",
            sessions: ps.length,
            avgScore: Math.round(avgScore * 100) / 100,
            avgAcc: Math.round(avgAcc * 100) / 100,
            asSub: as.length,
            asGr: as.filter((x) => x.grade !== null).length,
          });
        });

        styleHeaderRow(overview);
        styleHeaderRow(perf);
      }

      // Quiz Participation
      if (reportType === "all" || reportType === "quizzes" || reportType === "detailed") {
        const sheet = workbook.addWorksheet("Quiz Participation");
        sheet.columns = [
          { header: "Student Name", key: "name", width: 22 },
          { header: "Email", key: "email", width: 30 },
          { header: "Department", key: "dept", width: 16 },
          { header: "Section", key: "sec", width: 10 },
          { header: "Quiz Title", key: "quiz", width: 28 },
          { header: "Topic", key: "topic", width: 16 },
          { header: "Difficulty", key: "difficulty", width: 12 },
          { header: "Room Code", key: "room", width: 12 },
          { header: "Score", key: "score", width: 10 },
          { header: "Accuracy %", key: "acc", width: 12 },
          { header: "Date Joined", key: "date", width: 12 },
          { header: "Status", key: "status", width: 12 },
        ];

        for (const p of participations) {
          const student = studentById.get(p.studentId);
          if (!student) continue;
          const acc = p.questionsAnswered > 0 ? (p.correctAnswers / p.questionsAnswered) * 100 : 0;
          sheet.addRow({
            name: student.fullName,
            email: student.email,
            dept: student.department || "-",
            sec: student.section || "-",
            quiz: p.session.quiz.title,
            topic: p.session.quiz.topic,
            difficulty: p.session.quiz.difficulty,
            room: p.session.roomCode,
            score: p.sessionScore,
            acc: Math.round(acc * 100) / 100,
            date: toISODate(p.joinedAt),
            status: p.session.status,
          });
        }

        styleHeaderRow(sheet);
      }

      // Assignment Submissions
      if (reportType === "all" || reportType === "assignments" || reportType === "detailed") {
        const sheet = workbook.addWorksheet("Assignment Submissions");
        sheet.columns = [
          { header: "Student Name", key: "name", width: 22 },
          { header: "Email", key: "email", width: 30 },
          { header: "Department", key: "dept", width: 16 },
          { header: "Section", key: "sec", width: 10 },
          { header: "Assignment Title", key: "title", width: 30 },
          { header: "Topic", key: "topic", width: 18 },
          { header: "Difficulty", key: "difficulty", width: 12 },
          { header: "Grade", key: "grade", width: 10 },
          { header: "Max Points", key: "max", width: 12 },
          { header: "Submitted At", key: "submitted", width: 12 },
        ];

        for (const a of assignmentSubmissions) {
          const student = studentById.get(a.studentId);
          if (!student) continue;
          sheet.addRow({
            name: student.fullName,
            email: student.email,
            dept: student.department || "-",
            sec: student.section || "-",
            title: a.assignment.title,
            topic: a.assignment.topic || "-",
            difficulty: a.assignment.difficulty,
            grade: a.grade !== null ? a.grade : "Pending",
            max: a.assignment.maxPoints,
            submitted: toISODate(a.submittedAt),
          });
        }

        styleHeaderRow(sheet);
      }

      const filename = makeFilename({ department, section, type: reportType });
      const arrayBuffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
      const excelBuffer = Buffer.from(arrayBuffer);

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // 1. Executive Summary Sheet (Always included)
    const summaryData = [
      { "Metric": "Report Generated", "Value": new Date().toLocaleString() },
      { "Metric": "Generated By", "Value": profile.fullName },
      { "Metric": "Total Students", "Value": students.length },
      { 
        "Metric": "Filter Applied", 
        "Value": [
          department && department !== "all" ? `Department: ${department}` : null,
          section && section !== "all" ? `Section: ${section}` : null,
        ].filter(Boolean).join(" • ") || "All Students"
      },
      { "Metric": "Date Range", "Value": dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : "All Time" },
      { "Metric": "Report Type", "Value": reportType === "all" ? "Comprehensive Report" : reportType },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    setColumnWidths(summarySheet, [30, 50]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Report Summary");

    // 2. Student Overview Sheet (with rankings and calculated metrics)
    if (reportType === "all" || reportType === "performance" || reportType === "detailed") {
      const overviewDataPromises = students.map(async (student, index) => {
        // Calculate average score from participations
        const participations = await prisma.sessionParticipant.findMany({
          where: { 
            studentId: student.id,
            ...(dateFilter ? { joinedAt: dateFilter } : {}),
          },
        });

        const avgScore = participations.length > 0
          ? participations.reduce((sum, p) => sum + p.sessionScore, 0) / participations.length
          : 0;

        return {
          "Rank": index + 1,
          "Student Name": student.fullName,
          "Email": student.email,
          "Roll Number": student.rollNumber || "-",
          "Department": student.department || "-",
          "Section": student.section || "-",
          "Total Score": student.totalScore,
          "Quizzes Taken": student.quizzesTaken,
          "Average Score": Math.round(avgScore * 100) / 100,
          "Performance Grade": student.totalScore >= 1000 ? "Excellent" : student.totalScore >= 500 ? "Good" : student.totalScore >= 200 ? "Average" : "Needs Improvement",
        };
      });

      const overviewData = await Promise.all(overviewDataPromises);

      const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
      setColumnWidths(overviewSheet, [8, 25, 30, 15, 14, 12, 12, 12, 15, 20]);
      XLSX.utils.book_append_sheet(workbook, overviewSheet, "Student Overview");
    }

    // 3. Quiz Participation Sheet (Enhanced)
    if (reportType === "all" || reportType === "quizzes" || reportType === "detailed") {
      const quizData: Array<{
        "Student Name": string;
        "Email": string;
        "Roll Number": string;
        "Department": string;
        "Section": string;
        "Quiz Title": string;
        "Topic": string;
        "Difficulty": string;
        "Room Code": string;
        "Score": number;
        "Max Score": number;
        "Accuracy %": number;
        "Questions Answered": number;
        "Total Questions": number;
        "Correct Answers": number;
        "Time Taken (min)": number;
        "Date Joined": string;
        "Session Status": string;
      }> = [];

      for (const student of students) {
        const participations = await prisma.sessionParticipant.findMany({
          where: { 
            studentId: student.id,
            ...(quizId ? { session: { quizId } } : {}),
            ...(dateFilter ? { joinedAt: dateFilter } : {}),
          },
          include: {
            session: {
              select: {
                id: true,
                roomCode: true,
                status: true,
                startedAt: true,
                endedAt: true,
                quiz: {
                  select: {
                    id: true,
                    title: true,
                    topic: true,
                    difficulty: true,
                    totalQuestions: true,
                    timeLimit: true,
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
          
          const maxScore = participation.session.quiz.totalQuestions * 10; // Assuming 10 points per question
          const session = participation.session;
          const timeTaken = session.startedAt && session.endedAt
            ? Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)
            : session.startedAt
            ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000)
            : 0;

          quizData.push({
            "Student Name": student.fullName,
            "Email": student.email,
            "Roll Number": student.rollNumber || "-",
            "Department": student.department || "-",
            "Section": student.section || "-",
            "Quiz Title": participation.session.quiz.title,
            "Topic": participation.session.quiz.topic,
            "Difficulty": participation.session.quiz.difficulty,
            "Room Code": participation.session.roomCode,
            "Score": participation.sessionScore,
            "Max Score": maxScore,
            "Accuracy %": Math.round(accuracy * 100) / 100,
            "Questions Answered": participation.questionsAnswered,
            "Total Questions": participation.session.quiz.totalQuestions,
            "Correct Answers": participation.correctAnswers,
            "Time Taken (min)": timeTaken,
            "Date Joined": participation.joinedAt.toISOString().split("T")[0],
            "Session Status": participation.session.status,
          });
        });
      }

      if (quizData.length > 0) {
        const quizSheet = XLSX.utils.json_to_sheet(quizData);
        setColumnWidths(quizSheet, [20, 30, 15, 12, 30, 20, 12, 12, 10, 10, 12, 12, 12, 12, 15, 12, 12]);
        XLSX.utils.book_append_sheet(workbook, quizSheet, "Quiz Participation");
      }
    }

    // 4. Assignment Submissions Sheet (Enhanced)
    if (reportType === "all" || reportType === "assignments" || reportType === "detailed") {
      const assignmentData: Array<{
        "Student Name": string;
        "Email": string;
        "Roll Number": string;
        "Department": string;
        "Section": string;
        "Assignment Title": string;
        "Topic": string;
        "Difficulty": string;
        "Grade": number | string;
        "Max Points": number;
        "Percentage": number | string;
        "Status": string;
        "Submitted At": string;
        "Graded At": string;
        "Graded By": string;
        "Feedback": string;
      }> = [];

      for (const student of students) {
        const assignments = await prisma.assignmentSubmission.findMany({
          where: { 
            studentId: student.id,
            ...(dateFilter ? { submittedAt: dateFilter } : {}),
          },
          include: {
            assignment: {
              select: {
                title: true,
                maxPoints: true,
                topic: true,
                difficulty: true,
              },
            },
            student: {
              select: {
                fullName: true,
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
            "Roll Number": student.rollNumber || "-",
            "Department": student.department || "-",
            "Section": student.section || "-",
            "Assignment Title": assignment.assignment.title,
            "Topic": assignment.assignment.topic || "-",
            "Difficulty": assignment.assignment.difficulty,
            "Grade": assignment.grade !== null ? assignment.grade : "Pending",
            "Max Points": assignment.assignment.maxPoints,
            "Percentage": percentage !== null ? `${percentage.toFixed(1)}%` : "Pending",
            "Status": assignment.status,
            "Submitted At": assignment.submittedAt.toISOString().split("T")[0],
            "Graded At": assignment.gradedAt
              ? assignment.gradedAt.toISOString().split("T")[0]
              : "Not Graded",
            "Graded By": assignment.gradedById ? "Teacher" : "-",
            "Feedback": assignment.feedback || "-",
          });
        });
      }

      if (assignmentData.length > 0) {
        const assignmentSheet = XLSX.utils.json_to_sheet(assignmentData);
        setColumnWidths(assignmentSheet, [20, 30, 15, 14, 12, 30, 20, 12, 10, 10, 12, 12, 12, 12, 15, 30]);
        XLSX.utils.book_append_sheet(workbook, assignmentSheet, "Assignment Submissions");
      }
    }

    // 5. Performance Summary Sheet (Enhanced with topic breakdown)
    if (reportType === "all" || reportType === "performance" || reportType === "detailed") {
      const performanceData: Array<{
        "Student Name": string;
        "Email": string;
        "Roll Number": string;
        "Department": string;
        "Section": string;
        "Total Sessions": number;
        "Average Score": number;
        "Average Accuracy %": number;
        "Total Points": number;
        "Quizzes Taken": number;
        "Assignments Submitted": number;
        "Assignments Graded": number;
        "Best Topic": string;
        "Weak Topic": string;
      }> = [];

      for (const student of students) {
        const participations = await prisma.sessionParticipant.findMany({
          where: { 
            studentId: student.id,
            ...(dateFilter ? { joinedAt: dateFilter } : {}),
          },
          include: {
            session: {
              include: {
                quiz: {
                  select: {
                    topic: true,
                  },
                },
              },
            },
          },
        });

        const assignments = await prisma.assignmentSubmission.findMany({
          where: { 
            studentId: student.id,
            ...(dateFilter ? { submittedAt: dateFilter } : {}),
          },
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

        // Topic performance analysis
        const topicStats = new Map<string, { correct: number; total: number }>();
        participations.forEach((p) => {
          const topic = p.session.quiz.topic;
          if (!topicStats.has(topic)) {
            topicStats.set(topic, { correct: 0, total: 0 });
          }
          const stats = topicStats.get(topic)!;
          stats.correct += p.correctAnswers;
          stats.total += p.questionsAnswered;
        });

        let bestTopic = "-";
        let weakTopic = "-";
        let bestAccuracy = 0;
        let weakAccuracy = 100;

        topicStats.forEach((stats, topic) => {
          const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
          if (accuracy > bestAccuracy && stats.total >= 3) {
            bestAccuracy = accuracy;
            bestTopic = topic;
          }
          if (accuracy < weakAccuracy && stats.total >= 3) {
            weakAccuracy = accuracy;
            weakTopic = topic;
          }
        });

        performanceData.push({
          "Student Name": student.fullName,
          "Email": student.email,
          "Roll Number": student.rollNumber || "-",
          "Department": student.department || "-",
          "Section": student.section || "-",
          "Total Sessions": totalSessions,
          "Average Score": Math.round(avgScore * 100) / 100,
          "Average Accuracy %": Math.round(avgAccuracy * 100) / 100,
          "Total Points": student.totalScore,
          "Quizzes Taken": student.quizzesTaken,
          "Assignments Submitted": assignments.length,
          "Assignments Graded": assignments.filter(a => a.grade !== null).length,
          "Best Topic": bestTopic,
          "Weak Topic": weakTopic,
        });
      }

      if (performanceData.length > 0) {
        const performanceSheet = XLSX.utils.json_to_sheet(performanceData);
        setColumnWidths(performanceSheet, [20, 30, 15, 14, 12, 12, 12, 15, 12, 12, 18, 18, 20, 20]);
        XLSX.utils.book_append_sheet(workbook, performanceSheet, "Performance Summary");
      }
    }

    // 6. Topic-wise Performance Sheet
    if (reportType === "all" || reportType === "detailed") {
      const topicData: Array<{
        "Topic": string;
        "Total Students": number;
        "Total Attempts": number;
        "Average Accuracy %": number;
        "Average Score": number;
        "Best Student": string;
        "Best Score": number;
      }> = [];

      // Get all unique topics
      const topics = await prisma.quiz.findMany({
        where: {
          createdById: profile.id,
        },
        select: {
          topic: true,
        },
        distinct: ["topic"],
      });

      for (const topicObj of topics) {
        const topic = topicObj.topic;
        
        // Get all participations for this topic
        const topicParticipations = await prisma.sessionParticipant.findMany({
          where: {
            studentId: { in: students.map(s => s.id) },
            session: {
              quiz: {
                topic,
                createdById: profile.id,
              },
            },
            ...(dateFilter ? { joinedAt: dateFilter } : {}),
          },
          include: {
            student: {
              select: {
                fullName: true,
              },
            },
          },
        });

        if (topicParticipations.length === 0) continue;

        const uniqueStudents = new Set(topicParticipations.map(p => p.studentId));
        const avgAccuracy =
          topicParticipations.length > 0
            ? topicParticipations.reduce(
                (sum, p) =>
                  sum + (p.questionsAnswered > 0
                    ? (p.correctAnswers / p.questionsAnswered) * 100
                    : 0),
                0
              ) / topicParticipations.length
            : 0;
        
        const avgScore =
          topicParticipations.length > 0
            ? topicParticipations.reduce((sum, p) => sum + p.sessionScore, 0) / topicParticipations.length
            : 0;

        // Find best student
        const bestParticipation = topicParticipations.reduce((best, current) => {
          const currentAccuracy = current.questionsAnswered > 0
            ? (current.correctAnswers / current.questionsAnswered) * 100
            : 0;
          const bestAccuracy = best.questionsAnswered > 0
            ? (best.correctAnswers / best.questionsAnswered) * 100
            : 0;
          return currentAccuracy > bestAccuracy ? current : best;
        }, topicParticipations[0]);

        topicData.push({
          "Topic": topic,
          "Total Students": uniqueStudents.size,
          "Total Attempts": topicParticipations.length,
          "Average Accuracy %": Math.round(avgAccuracy * 100) / 100,
          "Average Score": Math.round(avgScore * 100) / 100,
          "Best Student": bestParticipation.student.fullName,
          "Best Score": bestParticipation.sessionScore,
        });
      }

      if (topicData.length > 0) {
        const topicSheet = XLSX.utils.json_to_sheet(topicData);
        setColumnWidths(topicSheet, [25, 15, 15, 18, 15, 25, 12]);
        XLSX.utils.book_append_sheet(workbook, topicSheet, "Topic Performance");
      }
    }

    // 7. Question-level Analysis Sheet
    if (reportType === "all" || reportType === "detailed") {
      const questionData: Array<{
        "Question Text": string;
        "Topic": string;
        "Difficulty": string;
        "Quiz Title": string;
        "Total Attempts": number;
        "Correct Answers": number;
        "Incorrect Answers": number;
        "Accuracy %": number;
        "Average Time (sec)": number;
      }> = [];

      // Get all questions from quizzes created by this teacher
      const questions = await prisma.question.findMany({
        where: {
          quiz: {
            createdById: profile.id,
            ...(quizId ? { id: quizId } : {}),
          },
        },
        include: {
          quiz: {
            select: {
              title: true,
              topic: true,
              difficulty: true,
            },
          },
          submissions: {
            where: {
              studentId: { in: students.map(s => s.id) },
              ...(dateFilter ? { submittedAt: dateFilter } : {}),
            },
            select: {
              isCorrect: true,
              timeTaken: true,
            },
          },
        },
      });

      questions.forEach((question) => {
        const totalAttempts = question.submissions.length;
        const correctAnswers = question.submissions.filter(s => s.isCorrect).length;
        const incorrectAnswers = totalAttempts - correctAnswers;
        const accuracy = totalAttempts > 0 ? (correctAnswers / totalAttempts) * 100 : 0;
        const avgTime = question.submissions.length > 0
          ? question.submissions.reduce((sum, s) => sum + (s.timeTaken || 0), 0) / question.submissions.length
          : 0;

        questionData.push({
          "Question Text": question.questionText.substring(0, 100) + (question.questionText.length > 100 ? "..." : ""),
          "Topic": question.quiz.topic,
          "Difficulty": question.quiz.difficulty,
          "Quiz Title": question.quiz.title,
          "Total Attempts": totalAttempts,
          "Correct Answers": correctAnswers,
          "Incorrect Answers": incorrectAnswers,
          "Accuracy %": Math.round(accuracy * 100) / 100,
          "Average Time (sec)": Math.round(avgTime),
        });
      });

      if (questionData.length > 0) {
        const questionSheet = XLSX.utils.json_to_sheet(questionData);
        setColumnWidths(questionSheet, [50, 20, 12, 30, 15, 15, 18, 12, 18]);
        XLSX.utils.book_append_sheet(workbook, questionSheet, "Question Analysis");
      }
    }

    // 8. Section-wise Summary Sheet (Enhanced)
    if (reportType === "all" || reportType === "performance" || reportType === "detailed") {
      const sections = await prisma.profile.findMany({
        where: { 
          role: "student", 
          section: { not: null },
          ...(section && section !== "all" ? { section } : {}),
        },
        select: { department: true, section: true },
        distinct: ["department", "section"],
      });

      const sectionSummaryData: Array<{
        "Department": string;
        "Section": string;
        "Total Students": number;
        "Active Students": number;
        "Average Score": number;
        "Average Accuracy %": number;
        "Total Sessions": number;
        "Total Assignments": number;
        "Top Performer": string;
        "Top Score": number;
        "Improvement Rate": string;
      }> = [];

      for (const sec of sections) {
        if (!sec.section) continue;

        const secStudents = await prisma.profile.findMany({
          where: { role: "student", department: sec.department, section: sec.section },
          select: { id: true, fullName: true, totalScore: true },
        });

        const secParticipations = await prisma.sessionParticipant.findMany({
          where: {
            studentId: { in: secStudents.map((s) => s.id) },
            ...(dateFilter ? { joinedAt: dateFilter } : {}),
          },
        });

        const activeStudents = new Set(secParticipations.map(p => p.studentId)).size;

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

        const assignments = await prisma.assignmentSubmission.findMany({
          where: {
            studentId: { in: secStudents.map(s => s.id) },
            ...(dateFilter ? { submittedAt: dateFilter } : {}),
          },
        });

        // Find top performer
        const topStudent = secStudents.reduce((top, current) => 
          current.totalScore > top.totalScore ? current : top, 
          secStudents[0] || { fullName: "-", totalScore: 0 }
        );

        // Calculate improvement (comparing recent vs older performance)
        const recentParticipations = secParticipations.filter(p => {
          const date = new Date(p.joinedAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return date >= thirtyDaysAgo;
        });

        const olderParticipations = secParticipations.filter(p => {
          const date = new Date(p.joinedAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return date < thirtyDaysAgo;
        });

        let improvementRate = "-";
        if (recentParticipations.length > 0 && olderParticipations.length > 0) {
          const recentAvg = recentParticipations.reduce(
            (sum, p) => sum + (p.questionsAnswered > 0 ? (p.correctAnswers / p.questionsAnswered) * 100 : 0),
            0
          ) / recentParticipations.length;
          
          const olderAvg = olderParticipations.reduce(
            (sum, p) => sum + (p.questionsAnswered > 0 ? (p.correctAnswers / p.questionsAnswered) * 100 : 0),
            0
          ) / olderParticipations.length;

          const improvement = recentAvg - olderAvg;
          improvementRate = improvement > 0 
            ? `+${improvement.toFixed(1)}%` 
            : `${improvement.toFixed(1)}%`;
        }

        sectionSummaryData.push({
          "Department": sec.department || "-",
          "Section": sec.section,
          "Total Students": secStudents.length,
          "Active Students": activeStudents,
          "Average Score": Math.round(avgScore * 100) / 100,
          "Average Accuracy %": Math.round(avgAccuracy * 100) / 100,
          "Total Sessions": secParticipations.length,
          "Total Assignments": assignments.length,
          "Top Performer": topStudent.fullName,
          "Top Score": topStudent.totalScore,
          "Improvement Rate": improvementRate,
        });
      }

      if (sectionSummaryData.length > 0) {
        const sectionSheet = XLSX.utils.json_to_sheet(sectionSummaryData);
        setColumnWidths(sectionSheet, [14, 12, 15, 15, 15, 18, 15, 18, 25, 12, 15]);
        XLSX.utils.book_append_sheet(workbook, sectionSheet, "Section Summary");
      }
    }

    // 9. Time-based Analytics Sheet
    if (reportType === "all" || reportType === "detailed") {
      const timeData: Array<{
        "Date": string;
        "Total Sessions": number;
        "Total Participants": number;
        "Average Score": number;
        "Average Accuracy %": number;
        "Quizzes Conducted": number;
      }> = [];

      const allParticipations = await prisma.sessionParticipant.findMany({
        where: {
          studentId: { in: students.map(s => s.id) },
          ...(dateFilter ? { joinedAt: dateFilter } : {}),
        },
        include: {
          session: {
            include: {
              quiz: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      });

      type Participation = (typeof allParticipations)[number];
      // Group by date
      const dateGroups = new Map<string, Participation[]>();

      allParticipations.forEach((p) => {
        const date = p.joinedAt.toISOString().split("T")[0];
        if (!dateGroups.has(date)) {
          dateGroups.set(date, []);
        }
        dateGroups.get(date)!.push(p);
      });

      dateGroups.forEach((participations, date) => {
        const uniqueSessions = new Set(participations.map(p => p.sessionId));
        const avgScore = participations.length > 0
          ? participations.reduce((sum, p) => sum + p.sessionScore, 0) / participations.length
          : 0;
        const avgAccuracy = participations.length > 0
          ? participations.reduce(
              (sum, p) => sum + (p.questionsAnswered > 0
                ? (p.correctAnswers / p.questionsAnswered) * 100
                : 0),
              0
            ) / participations.length
          : 0;

        timeData.push({
          "Date": date,
          "Total Sessions": uniqueSessions.size,
          "Total Participants": participations.length,
          "Average Score": Math.round(avgScore * 100) / 100,
          "Average Accuracy %": Math.round(avgAccuracy * 100) / 100,
          "Quizzes Conducted": uniqueSessions.size,
        });
      });

      if (timeData.length > 0) {
        timeData.sort((a, b) => a.Date.localeCompare(b.Date));
        const timeSheet = XLSX.utils.json_to_sheet(timeData);
        setColumnWidths(timeSheet, [12, 15, 18, 15, 18, 18]);
        XLSX.utils.book_append_sheet(workbook, timeSheet, "Time Analytics");
      }
    }

    // 10. Violations Report Sheet (if violations exist)
    if (reportType === "all" || reportType === "violations" || reportType === "detailed") {
      // Note: This would require a violations table in the database
      // For now, we'll create an empty sheet structure
      const violationsData: Array<{
        "Student Name": string;
        "Email": string;
        "Section": string;
        "Quiz Title": string;
        "Violation Type": string;
        "Violation Count": number;
        "Date": string;
      }> = [];

      // In production, you'd fetch from a violations table
      // const violations = await prisma.violation.findMany({...});

      if (violationsData.length > 0) {
        const violationsSheet = XLSX.utils.json_to_sheet(violationsData);
        setColumnWidths(violationsSheet, [20, 30, 12, 30, 20, 15, 12]);
        XLSX.utils.book_append_sheet(workbook, violationsSheet, "Violations Report");
      }
    }

    // Generate Excel file buffer with better formatting
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      cellStyles: true,
    });

    // Create descriptive filename
    const timestamp = new Date().toISOString().split("T")[0];
    const sectionPart = section && section !== "all" ? `-${section}` : "";
    const typePart = reportType !== "all" ? `-${reportType}` : "";
    const filename = `Performance-Report${sectionPart}${typePart}-${timestamp}.xlsx`;

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
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
