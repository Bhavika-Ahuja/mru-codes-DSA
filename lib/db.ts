/**
 * Database utilities using Prisma
 * This file provides helper functions for common database operations
 */

import prisma from "./prisma";
import type { Profile, Quiz, Question, QuizSession, Submission } from "@prisma/client";

// ============================================================
// PROFILE OPERATIONS
// ============================================================

export async function getProfileById(id: string): Promise<Profile | null> {
  return prisma.profile.findUnique({
    where: { id },
  });
}

export async function getProfileByEmail(email: string): Promise<Profile | null> {
  return prisma.profile.findUnique({
    where: { email },
  });
}

export async function createProfile(data: {
  id: string;
  email: string;
  fullName: string;
  rollNumber?: string;
  section?: string;
  role?: "student" | "teacher";
  avatarUrl?: string;
}): Promise<Profile> {
  return prisma.profile.create({
    data: {
      id: data.id,
      email: data.email,
      fullName: data.fullName,
      rollNumber: data.rollNumber,
      section: data.section,
      role: data.role || "student",
      avatarUrl: data.avatarUrl,
    },
  });
}

export async function updateProfile(
  id: string,
  data: Partial<{
    fullName: string;
    rollNumber: string;
    section: string;
    avatarUrl: string;
  }>
): Promise<Profile> {
  return prisma.profile.update({
    where: { id },
    data,
  });
}

// ============================================================
// QUIZ OPERATIONS
// ============================================================

export async function getQuizById(id: string) {
  return prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { orderIndex: "asc" },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });
}

export async function getPublishedQuizzes() {
  return prisma.quiz.findMany({
    where: { status: "published" },
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getQuizzesByTeacher(teacherId: string) {
  return prisma.quiz.findMany({
    where: { createdById: teacherId },
    include: {
      _count: {
        select: { questions: true, sessions: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createQuiz(data: {
  title: string;
  description?: string;
  topic: string;
  difficulty?: "easy" | "medium" | "hard";
  timeLimit?: number;
  createdById: string;
}) {
  return prisma.quiz.create({
    data: {
      title: data.title,
      description: data.description,
      topic: data.topic,
      difficulty: data.difficulty || "medium",
      timeLimit: data.timeLimit || 900,
      createdById: data.createdById,
    },
  });
}

// ============================================================
// QUESTION OPERATIONS
// ============================================================

export type QuestionOption = {
  id: string;
  text: string;
  is_correct: boolean;
};

export async function addQuestionToQuiz(data: {
  quizId: string;
  questionText: string;
  questionType?: "mcq" | "code" | "true_false";
  points?: number;
  timeLimit?: number;
  orderIndex?: number;
  options: QuestionOption[];
  explanation?: string;
}) {
  const question = await prisma.question.create({
    data: {
      quizId: data.quizId,
      questionText: data.questionText,
      questionType: data.questionType || "mcq",
      points: data.points || 1, // Default to 1 mark per correct answer
      timeLimit: data.timeLimit,
      orderIndex: data.orderIndex || 0,
      options: data.options,
      explanation: data.explanation,
    },
  });

  // Update quiz question count
  await prisma.quiz.update({
    where: { id: data.quizId },
    data: {
      totalQuestions: {
        increment: 1,
      },
    },
  });

  return question;
}

export async function getQuestionWithoutAnswer(questionId: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) return null;

  // Remove is_correct from options for student view
  const safeOptions = (question.options as QuestionOption[]).map((opt) => ({
    id: opt.id,
    text: opt.text,
  }));

  return {
    ...question,
    options: safeOptions,
  };
}

// ============================================================
// SESSION OPERATIONS
// ============================================================

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createQuizSession(data: {
  quizId: string;
  hostId: string;
}) {
  // Generate unique room code
  let roomCode = generateRoomCode();
  let attempts = 0;
  
  while (attempts < 10) {
    const existing = await prisma.quizSession.findUnique({
      where: { roomCode },
    });
    if (!existing) break;
    roomCode = generateRoomCode();
    attempts++;
  }

  return prisma.quizSession.create({
    data: {
      quizId: data.quizId,
      hostId: data.hostId,
      roomCode,
      status: "waiting",
    },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
  });
}

export async function getSessionByRoomCode(roomCode: string) {
  return prisma.quizSession.findUnique({
    where: { roomCode: roomCode.toUpperCase() },
    include: {
      quiz: true,
      host: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      participants: {
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              section: true,
            },
          },
        },
        orderBy: { sessionScore: "desc" },
      },
    },
  });
}

export async function joinSession(sessionId: string, studentId: string) {
  return prisma.sessionParticipant.upsert({
    where: {
      sessionId_studentId: {
        sessionId,
        studentId,
      },
    },
    update: {},
    create: {
      sessionId,
      studentId,
    },
  });
}

export async function updateSessionStatus(
  sessionId: string,
  data: {
    status?: "waiting" | "live" | "completed";
    currentQuestionId?: string | null;
    currentQuestionIndex?: number;
    questionStartedAt?: Date | null;
    startedAt?: Date | null;
    endedAt?: Date | null;
  }
) {
  return prisma.quizSession.update({
    where: { id: sessionId },
    data,
  });
}

// ============================================================
// SUBMISSION OPERATIONS
// ============================================================

export async function submitAnswer(data: {
  sessionId: string;
  questionId: string;
  studentId: string;
  selectedOptionId: string;
  timeTaken?: number;
}) {
  // Get the question to check if answer is correct
  const question = await prisma.question.findUnique({
    where: { id: data.questionId },
  });

  if (!question) {
    throw new Error("Question not found");
  }

  const options = question.options as QuestionOption[];
  const correctOption = options.find((opt) => opt.is_correct);
  const isCorrect = correctOption?.id === data.selectedOptionId;
  const score = isCorrect ? question.points : 0;

  // Create submission
  const submission = await prisma.submission.create({
    data: {
      sessionId: data.sessionId,
      questionId: data.questionId,
      studentId: data.studentId,
      selectedOptionId: data.selectedOptionId,
      isCorrect,
      score,
      timeTaken: data.timeTaken,
    },
  });

  // Update participant score
  await prisma.sessionParticipant.update({
    where: {
      sessionId_studentId: {
        sessionId: data.sessionId,
        studentId: data.studentId,
      },
    },
    data: {
      sessionScore: { increment: score },
      questionsAnswered: { increment: 1 },
      correctAnswers: { increment: isCorrect ? 1 : 0 },
    },
  });

  // Update profile total score
  await prisma.profile.update({
    where: { id: data.studentId },
    data: {
      totalScore: { increment: score },
    },
  });

  return {
    submission,
    isCorrect,
    score,
    correctOptionId: correctOption?.id,
    explanation: question.explanation,
  };
}

// ============================================================
// LEADERBOARD OPERATIONS
// ============================================================

export async function getGlobalLeaderboard(limit = 50) {
  return prisma.profile.findMany({
    where: { role: "student" },
    select: {
      id: true,
      fullName: true,
      rollNumber: true,
      section: true,
      avatarUrl: true,
      totalScore: true,
      quizzesTaken: true,
    },
    orderBy: { totalScore: "desc" },
    take: limit,
  });
}

export async function getSectionLeaderboard(section: string, limit = 50) {
  return prisma.profile.findMany({
    where: { 
      role: "student",
      section,
    },
    select: {
      id: true,
      fullName: true,
      rollNumber: true,
      section: true,
      avatarUrl: true,
      totalScore: true,
      quizzesTaken: true,
    },
    orderBy: { totalScore: "desc" },
    take: limit,
  });
}

export async function getSessionLeaderboard(sessionId: string) {
  return prisma.sessionParticipant.findMany({
    where: { sessionId },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          section: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { sessionScore: "desc" },
  });
}

