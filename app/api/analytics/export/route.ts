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
        createdAt: true,
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

      const needsDeepAnalytics = reportType === "all" || reportType === "detailed";

      const [participations, assignmentSubmissions, submissions] = await Promise.all([
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
                    id: true,
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
        needsDeepAnalytics && studentIds.length > 0
          ? prisma.submission.findMany({
              where: {
                studentId: { in: studentIds },
                ...(dateFilter ? { submittedAt: dateFilter } : {}),
                ...(quizId ? { session: { quizId } } : {}),
              },
              include: {
                question: {
                  select: {
                    id: true,
                    questionText: true,
                    points: true,
                    timeLimit: true,
                    orderIndex: true,
                    quiz: {
                      select: {
                        id: true,
                        title: true,
                        topic: true,
                        difficulty: true,
                      },
                    },
                  },
                },
                session: {
                  select: {
                    id: true,
                    roomCode: true,
                    status: true,
                    startedAt: true,
                    endedAt: true,
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
        const totalSessions = new Set(participations.map((p) => p.sessionId)).size;
        const totalQuizzes = new Set(participations.map((p) => p.session.quiz.id)).size;
        sheet.addRow({ metric: "Report Generated", value: new Date().toLocaleString() });
        sheet.addRow({ metric: "Generated By", value: profile.fullName });
        sheet.addRow({ metric: "Total Students", value: students.length });
        sheet.addRow({ metric: "Total Quiz Participations", value: participations.length });
        sheet.addRow({ metric: "Total Sessions", value: totalSessions });
        sheet.addRow({ metric: "Total Quizzes", value: totalQuizzes });
        sheet.addRow({ metric: "Total Assignment Submissions", value: assignmentSubmissions.length });
        sheet.addRow({
          metric: "Total Answer Submissions",
          value: needsDeepAnalytics ? submissions.length : "N/A (type is not all/detailed)",
        });
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
          { header: "Total Sessions", key: "sessions", width: 12 },
          { header: "Average Score", key: "avgScore", width: 14 },
          { header: "Average Accuracy %", key: "avgAcc", width: 16 },
          { header: "Joined At", key: "joinedAt", width: 14 },
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
          { header: "Best Topic", key: "bestTopic", width: 18 },
          { header: "Weak Topic", key: "weakTopic", width: 18 },
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

          // Best/weak topic using participations (min 3 answered questions)
          const topicStats = new Map<string, { correct: number; total: number }>();
          for (const p of ps) {
            const topic = p.session.quiz.topic || "-";
            const cur = topicStats.get(topic) ?? { correct: 0, total: 0 };
            cur.correct += p.correctAnswers;
            cur.total += p.questionsAnswered;
            topicStats.set(topic, cur);
          }
          let bestTopic = "-";
          let weakTopic = "-";
          let bestAcc = -1;
          let weakAcc = 101;
          for (const [topic, st] of topicStats) {
            if (st.total < 3) continue;
            const acc = st.total > 0 ? (st.correct / st.total) * 100 : 0;
            if (acc > bestAcc) {
              bestAcc = acc;
              bestTopic = topic;
            }
            if (acc < weakAcc) {
              weakAcc = acc;
              weakTopic = topic;
            }
          }

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
            sessions: ps.length,
            avgScore: Math.round(avgScore * 100) / 100,
            avgAcc: Math.round(avgAcc * 100) / 100,
            joinedAt: toISODate(student.createdAt),
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
            bestTopic,
            weakTopic,
          });
        });

        styleHeaderRow(overview);
        styleHeaderRow(perf);

        // One-row-per-student wide report (requested format)
        const wide = workbook.addWorksheet("Student Summary (Wide)");
        wide.columns = [
          { header: "Rank", key: "rank", width: 8 },
          { header: "Student", key: "student", width: 24 },
          { header: "Email", key: "email", width: 30 },
          { header: "Roll Number", key: "roll", width: 14 },
          { header: "Department", key: "dept", width: 16 },
          { header: "Section", key: "sec", width: 10 },
          { header: "Total Score", key: "totalScore", width: 12 },
          { header: "Total Quiz Taken", key: "totalQuizTaken", width: 16 },
          { header: "Distinct Quizzes", key: "distinctQuizzes", width: 16 },
          { header: "Distinct Topics", key: "distinctTopics", width: 16 },
          { header: "Total Sessions", key: "totalSessions", width: 14 },
          { header: "Total Questions Answered", key: "questionsAnswered", width: 22 },
          { header: "Total Correct", key: "correct", width: 14 },
          { header: "Overall Accuracy %", key: "overallAcc", width: 18 },
          { header: "Avg Session Score", key: "avgScore", width: 16 },
          { header: "Best Session Score", key: "bestScore", width: 18 },
          { header: "Worst Session Score", key: "worstScore", width: 18 },
          { header: "Last Quiz Attempt", key: "lastQuiz", width: 16 },
          { header: "Assignments Submitted", key: "asSub", width: 20 },
          { header: "Assignments Graded", key: "asGr", width: 18 },
          { header: "Avg Assignment %", key: "avgAsPct", width: 16 },
          { header: "Best Assignment %", key: "bestAsPct", width: 18 },
          { header: "Worst Assignment %", key: "worstAsPct", width: 18 },
          { header: "Last Assignment Submit", key: "lastAs", width: 20 },
          { header: "Best Topic", key: "bestTopic", width: 18 },
          { header: "Weak Topic", key: "weakTopic", width: 18 },
          { header: "Joined At", key: "joinedAt", width: 14 },
        ];

        students.forEach((student, idx) => {
          const ps = participationsByStudent.get(student.id) ?? [];
          const as = assignmentsByStudent.get(student.id) ?? [];

          const distinctQuizIds = new Set(ps.map((p) => p.session.quiz.id));
          const distinctTopics = new Set(ps.map((p) => p.session.quiz.topic || "-"));
          const totalQuizTaken = ps.length;

          let questionsAnswered = 0;
          let correct = 0;
          let scoreSum = 0;
          let bestScore = -Infinity;
          let worstScore = Infinity;
          let lastQuiz: Date | null = null;
          for (const p of ps) {
            questionsAnswered += p.questionsAnswered;
            correct += p.correctAnswers;
            scoreSum += p.sessionScore;
            if (p.sessionScore > bestScore) bestScore = p.sessionScore;
            if (p.sessionScore < worstScore) worstScore = p.sessionScore;
            if (!lastQuiz || p.joinedAt > lastQuiz) lastQuiz = p.joinedAt;
          }
          const overallAcc = questionsAnswered > 0 ? (correct / questionsAnswered) * 100 : 0;
          const avgScore = ps.length > 0 ? scoreSum / ps.length : 0;

          let asGr = 0;
          let asPctSum = 0;
          let asPctCount = 0;
          let bestAsPct = -Infinity;
          let worstAsPct = Infinity;
          let lastAs: Date | null = null;
          for (const a of as) {
            if (!lastAs || a.submittedAt > lastAs) lastAs = a.submittedAt;
            if (a.grade !== null) {
              asGr += 1;
              const pct = a.assignment.maxPoints > 0 ? (a.grade / a.assignment.maxPoints) * 100 : 0;
              asPctSum += pct;
              asPctCount += 1;
              if (pct > bestAsPct) bestAsPct = pct;
              if (pct < worstAsPct) worstAsPct = pct;
            }
          }
          const avgAsPct = asPctCount > 0 ? asPctSum / asPctCount : 0;

          // Recompute best/weak topic quickly from ps (same logic used above)
          const topicStats = new Map<string, { correct: number; total: number }>();
          for (const p of ps) {
            const topic = p.session.quiz.topic || "-";
            const cur = topicStats.get(topic) ?? { correct: 0, total: 0 };
            cur.correct += p.correctAnswers;
            cur.total += p.questionsAnswered;
            topicStats.set(topic, cur);
          }
          let bestTopic = "-";
          let weakTopic = "-";
          let bestAcc = -1;
          let weakAcc = 101;
          for (const [topic, st] of topicStats) {
            if (st.total < 3) continue;
            const acc = st.total > 0 ? (st.correct / st.total) * 100 : 0;
            if (acc > bestAcc) {
              bestAcc = acc;
              bestTopic = topic;
            }
            if (acc < weakAcc) {
              weakAcc = acc;
              weakTopic = topic;
            }
          }

          wide.addRow({
            rank: idx + 1,
            student: student.fullName,
            email: student.email,
            roll: student.rollNumber || "-",
            dept: student.department || "-",
            sec: student.section || "-",
            totalScore: student.totalScore,
            totalQuizTaken,
            distinctQuizzes: distinctQuizIds.size,
            distinctTopics: distinctTopics.size,
            totalSessions: ps.length,
            questionsAnswered,
            correct,
            overallAcc: Math.round(overallAcc * 100) / 100,
            avgScore: Math.round(avgScore * 100) / 100,
            bestScore: bestScore === -Infinity ? 0 : bestScore,
            worstScore: worstScore === Infinity ? 0 : worstScore,
            lastQuiz: lastQuiz ? toISODate(lastQuiz) : "-",
            asSub: as.length,
            asGr,
            avgAsPct: Math.round(avgAsPct * 100) / 100,
            bestAsPct: bestAsPct === -Infinity ? "-" : Math.round(bestAsPct * 100) / 100,
            worstAsPct: worstAsPct === Infinity ? "-" : Math.round(worstAsPct * 100) / 100,
            lastAs: lastAs ? toISODate(lastAs) : "-",
            bestTopic,
            weakTopic,
            joinedAt: toISODate(student.createdAt),
          });
        });

        styleHeaderRow(wide);
      }

      // Quiz Participation
      if (reportType === "all" || reportType === "quizzes" || reportType === "detailed") {
        const sheet = workbook.addWorksheet("Quiz Participation");
        sheet.columns = [
          { header: "Student Name", key: "name", width: 22 },
          { header: "Email", key: "email", width: 30 },
          { header: "Roll Number", key: "roll", width: 14 },
          { header: "Department", key: "dept", width: 16 },
          { header: "Section", key: "sec", width: 10 },
          { header: "Session ID", key: "sessionId", width: 38 },
          { header: "Quiz Title", key: "quiz", width: 28 },
          { header: "Topic", key: "topic", width: 16 },
          { header: "Difficulty", key: "difficulty", width: 12 },
          { header: "Total Questions", key: "totalQ", width: 14 },
          { header: "Time Limit (sec)", key: "timeLimit", width: 14 },
          { header: "Room Code", key: "room", width: 12 },
          { header: "Session Started", key: "startedAt", width: 14 },
          { header: "Session Ended", key: "endedAt", width: 14 },
          { header: "Score", key: "score", width: 10 },
          { header: "Questions Answered", key: "answered", width: 16 },
          { header: "Correct Answers", key: "correct", width: 14 },
          { header: "Accuracy %", key: "acc", width: 12 },
          { header: "Time Taken (min)", key: "timeTaken", width: 14 },
          { header: "Date Joined", key: "date", width: 12 },
          { header: "Status", key: "status", width: 12 },
        ];

        for (const p of participations) {
          const student = studentById.get(p.studentId);
          if (!student) continue;
          const acc = p.questionsAnswered > 0 ? (p.correctAnswers / p.questionsAnswered) * 100 : 0;
          const startedAt = p.session.startedAt ? toISODate(p.session.startedAt) : "-";
          const endedAt = p.session.endedAt ? toISODate(p.session.endedAt) : "-";
          const timeTaken =
            p.session.startedAt && p.session.endedAt
              ? Math.floor((p.session.endedAt.getTime() - p.session.startedAt.getTime()) / 60000)
              : "-";
          sheet.addRow({
            name: student.fullName,
            email: student.email,
            roll: student.rollNumber || "-",
            dept: student.department || "-",
            sec: student.section || "-",
            sessionId: p.session.id,
            quiz: p.session.quiz.title,
            topic: p.session.quiz.topic,
            difficulty: p.session.quiz.difficulty,
            totalQ: p.session.quiz.totalQuestions,
            timeLimit: p.session.quiz.timeLimit,
            room: p.session.roomCode,
            startedAt,
            endedAt,
            score: p.sessionScore,
            answered: p.questionsAnswered,
            correct: p.correctAnswers,
            acc: Math.round(acc * 100) / 100,
            timeTaken,
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
          { header: "Roll Number", key: "roll", width: 14 },
          { header: "Department", key: "dept", width: 16 },
          { header: "Section", key: "sec", width: 10 },
          { header: "Assignment ID", key: "assignmentId", width: 38 },
          { header: "Assignment Title", key: "title", width: 30 },
          { header: "Topic", key: "topic", width: 18 },
          { header: "Difficulty", key: "difficulty", width: 12 },
          { header: "Status", key: "status", width: 12 },
          { header: "Grade", key: "grade", width: 10 },
          { header: "Max Points", key: "max", width: 12 },
          { header: "Percentage", key: "pct", width: 12 },
          { header: "Submitted PDF", key: "pdf", width: 40 },
          { header: "Submitted URL", key: "pdfUrl", width: 50 },
          { header: "Submitted At", key: "submitted", width: 12 },
          { header: "Graded At", key: "gradedAt", width: 12 },
          { header: "Feedback", key: "feedback", width: 40 },
        ];

        for (const a of assignmentSubmissions) {
          const student = studentById.get(a.studentId);
          if (!student) continue;
          const pct =
            a.grade !== null && a.assignment.maxPoints > 0
              ? `${((a.grade / a.assignment.maxPoints) * 100).toFixed(1)}%`
              : "-";
          sheet.addRow({
            name: student.fullName,
            email: student.email,
            roll: student.rollNumber || "-",
            dept: student.department || "-",
            sec: student.section || "-",
            assignmentId: a.assignment.id,
            title: a.assignment.title,
            topic: a.assignment.topic || "-",
            difficulty: a.assignment.difficulty,
            status: a.status,
            grade: a.grade !== null ? a.grade : "Pending",
            max: a.assignment.maxPoints,
            pct,
            pdf: a.pdfFileName,
            pdfUrl: a.pdfUrl,
            submitted: toISODate(a.submittedAt),
            gradedAt: a.gradedAt ? toISODate(a.gradedAt) : "-",
            feedback: a.feedback || "-",
          });
        }

        styleHeaderRow(sheet);
      }

      // Deep analytics sheets (only for type=all or type=detailed)
      if (needsDeepAnalytics) {
        // Topic Performance (from participations)
        {
          const sheet = workbook.addWorksheet("Topic Performance");
          sheet.columns = [
            { header: "Topic", key: "topic", width: 20 },
            { header: "Total Students", key: "students", width: 14 },
            { header: "Total Attempts", key: "attempts", width: 14 },
            { header: "Average Accuracy %", key: "avgAcc", width: 18 },
            { header: "Average Score", key: "avgScore", width: 14 },
            { header: "Best Student", key: "bestStudent", width: 24 },
            { header: "Best Score", key: "bestScore", width: 12 },
          ];

          type TopicAgg = {
            students: Set<string>;
            attempts: number;
            accSum: number;
            scoreSum: number;
            bestScore: number;
            bestStudentId: string | null;
          };
          const byTopic = new Map<string, TopicAgg>();
          for (const p of participations) {
            const topic = p.session.quiz.topic || "-";
            const acc = p.questionsAnswered > 0 ? (p.correctAnswers / p.questionsAnswered) * 100 : 0;
            const cur =
              byTopic.get(topic) ??
              {
                students: new Set<string>(),
                attempts: 0,
                accSum: 0,
                scoreSum: 0,
                bestScore: -Infinity,
                bestStudentId: null,
              };
            cur.students.add(p.studentId);
            cur.attempts += 1;
            cur.accSum += acc;
            cur.scoreSum += p.sessionScore;
            if (p.sessionScore > cur.bestScore) {
              cur.bestScore = p.sessionScore;
              cur.bestStudentId = p.studentId;
            }
            byTopic.set(topic, cur);
          }

          for (const [topic, agg] of [...byTopic.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
            sheet.addRow({
              topic,
              students: agg.students.size,
              attempts: agg.attempts,
              avgAcc: agg.attempts > 0 ? Math.round((agg.accSum / agg.attempts) * 100) / 100 : 0,
              avgScore: agg.attempts > 0 ? Math.round((agg.scoreSum / agg.attempts) * 100) / 100 : 0,
              bestStudent: agg.bestStudentId ? studentById.get(agg.bestStudentId)?.fullName ?? "-" : "-",
              bestScore: agg.bestScore === -Infinity ? 0 : agg.bestScore,
            });
          }
          styleHeaderRow(sheet);
        }

        // Raw Answer Submissions
        {
          const sheet = workbook.addWorksheet("Answer Submissions");
          sheet.columns = [
            { header: "Submitted At", key: "submittedAt", width: 14 },
            { header: "Student Name", key: "student", width: 22 },
            { header: "Email", key: "email", width: 30 },
            { header: "Department", key: "dept", width: 14 },
            { header: "Section", key: "sec", width: 10 },
            { header: "Session ID", key: "sessionId", width: 38 },
            { header: "Room Code", key: "room", width: 12 },
            { header: "Quiz Title", key: "quiz", width: 28 },
            { header: "Topic", key: "topic", width: 16 },
            { header: "Difficulty", key: "difficulty", width: 12 },
            { header: "Question", key: "question", width: 60 },
            { header: "Question ID", key: "questionId", width: 38 },
            { header: "Selected Option ID", key: "selected", width: 16 },
            { header: "Is Correct", key: "isCorrect", width: 10 },
            { header: "Score", key: "score", width: 8 },
            { header: "Time Taken (sec)", key: "timeTaken", width: 14 },
          ];

          for (const s of submissions) {
            const student = studentById.get(s.studentId);
            sheet.addRow({
              submittedAt: toISODate(s.submittedAt),
              student: student?.fullName ?? "-",
              email: student?.email ?? "-",
              dept: student?.department ?? "-",
              sec: student?.section ?? "-",
              sessionId: s.sessionId,
              room: s.session.roomCode,
              quiz: s.question.quiz.title,
              topic: s.question.quiz.topic,
              difficulty: s.question.quiz.difficulty,
              question: s.question.questionText,
              questionId: s.questionId,
              selected: s.selectedOptionId ?? "-",
              isCorrect: s.isCorrect ? "Yes" : "No",
              score: s.score,
              timeTaken: s.timeTaken ?? "-",
            });
          }
          styleHeaderRow(sheet);
        }

        // Question Analysis (aggregated from submissions)
        {
          const sheet = workbook.addWorksheet("Question Analysis");
          sheet.columns = [
            { header: "Quiz Title", key: "quiz", width: 28 },
            { header: "Topic", key: "topic", width: 16 },
            { header: "Difficulty", key: "difficulty", width: 12 },
            { header: "Question", key: "question", width: 60 },
            { header: "Question ID", key: "questionId", width: 38 },
            { header: "Total Attempts", key: "attempts", width: 14 },
            { header: "Correct", key: "correct", width: 10 },
            { header: "Incorrect", key: "incorrect", width: 12 },
            { header: "Accuracy %", key: "acc", width: 12 },
            { header: "Avg Time (sec)", key: "avgTime", width: 14 },
            { header: "Avg Score", key: "avgScore", width: 12 },
          ];

          type QAgg = {
            quizTitle: string;
            topic: string;
            difficulty: string;
            questionText: string;
            attempts: number;
            correct: number;
            timeSum: number;
            timeCount: number;
            scoreSum: number;
          };
          const byQuestion = new Map<string, QAgg>();
          for (const s of submissions) {
            const key = s.questionId;
            const cur =
              byQuestion.get(key) ??
              {
                quizTitle: s.question.quiz.title,
                topic: s.question.quiz.topic,
                difficulty: s.question.quiz.difficulty,
                questionText: s.question.questionText,
                attempts: 0,
                correct: 0,
                timeSum: 0,
                timeCount: 0,
                scoreSum: 0,
              };
            cur.attempts += 1;
            if (s.isCorrect) cur.correct += 1;
            cur.scoreSum += s.score;
            if (typeof s.timeTaken === "number") {
              cur.timeSum += s.timeTaken;
              cur.timeCount += 1;
            }
            byQuestion.set(key, cur);
          }

          for (const [questionId, agg] of [...byQuestion.entries()].sort((a, b) => a[1].quizTitle.localeCompare(b[1].quizTitle))) {
            const incorrect = agg.attempts - agg.correct;
            const acc = agg.attempts > 0 ? (agg.correct / agg.attempts) * 100 : 0;
            sheet.addRow({
              quiz: agg.quizTitle,
              topic: agg.topic,
              difficulty: agg.difficulty,
              question: agg.questionText,
              questionId,
              attempts: agg.attempts,
              correct: agg.correct,
              incorrect,
              acc: Math.round(acc * 100) / 100,
              avgTime: agg.timeCount > 0 ? Math.round(agg.timeSum / agg.timeCount) : "-",
              avgScore: agg.attempts > 0 ? Math.round((agg.scoreSum / agg.attempts) * 100) / 100 : 0,
            });
          }
          styleHeaderRow(sheet);
        }

        // Section Summary (department + section)
        {
          const sheet = workbook.addWorksheet("Section Summary");
          sheet.columns = [
            { header: "Department", key: "dept", width: 14 },
            { header: "Section", key: "sec", width: 10 },
            { header: "Total Students", key: "students", width: 14 },
            { header: "Active Students", key: "active", width: 14 },
            { header: "Average Score", key: "avgScore", width: 14 },
            { header: "Average Accuracy %", key: "avgAcc", width: 18 },
            { header: "Total Sessions", key: "sessions", width: 14 },
            { header: "Total Assignments", key: "assignments", width: 16 },
            { header: "Top Performer", key: "top", width: 24 },
            { header: "Top Score", key: "topScore", width: 12 },
            { header: "Improvement Rate", key: "improvement", width: 16 },
          ];

          type GroupKey = string;
          const groupKey = (dept: string | null, sec: string | null) => `${dept ?? "-"}__${sec ?? "-"}`;

          const studentsByGroup = new Map<GroupKey, typeof students>();
          for (const s of students) {
            const k = groupKey(s.department ?? null, s.section ?? null);
            const arr = studentsByGroup.get(k) ?? [];
            arr.push(s);
            studentsByGroup.set(k, arr);
          }

          const participationsByGroup = new Map<GroupKey, typeof participations>();
          for (const p of participations) {
            const st = studentById.get(p.studentId);
            const k = groupKey(st?.department ?? null, st?.section ?? null);
            const arr = participationsByGroup.get(k) ?? [];
            arr.push(p);
            participationsByGroup.set(k, arr);
          }

          const assignmentsByGroup = new Map<GroupKey, typeof assignmentSubmissions>();
          for (const a of assignmentSubmissions) {
            const st = studentById.get(a.studentId);
            const k = groupKey(st?.department ?? null, st?.section ?? null);
            const arr = assignmentsByGroup.get(k) ?? [];
            arr.push(a);
            assignmentsByGroup.set(k, arr);
          }

          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          for (const [k, groupStudents] of [...studentsByGroup.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
            const [dept, sec] = k.split("__");
            const ps = participationsByGroup.get(k) ?? [];
            const as = assignmentsByGroup.get(k) ?? [];

            const activeStudents = new Set(ps.map((p) => p.studentId)).size;
            const avgScore = ps.length > 0 ? ps.reduce((sum, p) => sum + p.sessionScore, 0) / ps.length : 0;
            const avgAcc =
              ps.length > 0
                ? ps.reduce((sum, p) => sum + (p.questionsAnswered > 0 ? (p.correctAnswers / p.questionsAnswered) * 100 : 0), 0) / ps.length
                : 0;

            const top = groupStudents.reduce((best, cur) => (cur.totalScore > best.totalScore ? cur : best), groupStudents[0]);

            const recent = ps.filter((p) => p.joinedAt >= thirtyDaysAgo);
            const older = ps.filter((p) => p.joinedAt < thirtyDaysAgo);
            let improvement = "-";
            if (recent.length > 0 && older.length > 0) {
              const rAcc =
                recent.reduce((sum, p) => sum + (p.questionsAnswered > 0 ? (p.correctAnswers / p.questionsAnswered) * 100 : 0), 0) / recent.length;
              const oAcc =
                older.reduce((sum, p) => sum + (p.questionsAnswered > 0 ? (p.correctAnswers / p.questionsAnswered) * 100 : 0), 0) / older.length;
              const diff = rAcc - oAcc;
              improvement = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
            }

            sheet.addRow({
              dept,
              sec,
              students: groupStudents.length,
              active: activeStudents,
              avgScore: Math.round(avgScore * 100) / 100,
              avgAcc: Math.round(avgAcc * 100) / 100,
              sessions: ps.length,
              assignments: as.length,
              top: top?.fullName ?? "-",
              topScore: top?.totalScore ?? 0,
              improvement,
            });
          }

          styleHeaderRow(sheet);
        }

        // Time Analytics (by day)
        {
          const sheet = workbook.addWorksheet("Time Analytics");
          sheet.columns = [
            { header: "Date", key: "date", width: 12 },
            { header: "Total Sessions", key: "sessions", width: 14 },
            { header: "Total Participants", key: "participants", width: 18 },
            { header: "Average Score", key: "avgScore", width: 14 },
            { header: "Average Accuracy %", key: "avgAcc", width: 18 },
            { header: "Quizzes Conducted", key: "quizzes", width: 18 },
          ];

          const byDate = new Map<
            string,
            {
              sessionIds: Set<string>;
              quizIds: Set<string>;
              participants: number;
              scoreSum: number;
              accSum: number;
            }
          >();
          for (const p of participations) {
            const d = toISODate(p.joinedAt);
            const acc = p.questionsAnswered > 0 ? (p.correctAnswers / p.questionsAnswered) * 100 : 0;
            const cur =
              byDate.get(d) ??
              { sessionIds: new Set<string>(), quizIds: new Set<string>(), participants: 0, scoreSum: 0, accSum: 0 };
            cur.sessionIds.add(p.sessionId);
            cur.quizIds.add(p.session.quiz.id);
            cur.participants += 1;
            cur.scoreSum += p.sessionScore;
            cur.accSum += acc;
            byDate.set(d, cur);
          }

          for (const [date, agg] of [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
            sheet.addRow({
              date,
              sessions: agg.sessionIds.size,
              participants: agg.participants,
              avgScore: agg.participants > 0 ? Math.round((agg.scoreSum / agg.participants) * 100) / 100 : 0,
              avgAcc: agg.participants > 0 ? Math.round((agg.accSum / agg.participants) * 100) / 100 : 0,
              quizzes: agg.quizIds.size,
            });
          }

          styleHeaderRow(sheet);
        }
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
