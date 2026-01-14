/**
 * Central type exports for DSA Learning Platform
 * Re-exports database types and adds application-specific types
 */

// Re-export all database types
export * from './database';

// ============================================================
// FORM TYPES
// ============================================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  full_name: string;
  roll_number: string;
  department: string;
  section?: string;
  role: 'student' | 'teacher';
}

export interface CreateQuizFormData {
  title: string;
  description?: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time_per_question: number;
}

export interface CreateQuestionFormData {
  question_text: string;
  question_type: 'mcq' | 'code' | 'true_false';
  points: number;
  time_limit?: number;
  options: {
    id: string;
    text: string;
    is_correct: boolean;
  }[];
  explanation?: string;
}

// ============================================================
// AI GENERATION TYPES
// ============================================================

export interface AIQuizGenerationRequest {
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
}

export interface AIQuizGenerationResponse {
  success: boolean;
  questions: GeneratedQuestion[];
  error?: string;
}

// ============================================================
// REALTIME EVENT TYPES
// ============================================================

export interface QuizStateUpdate {
  session_id: string;
  status: 'waiting' | 'live' | 'completed';
  current_question_index: number;
  current_question_id: string | null;
  question_started_at: string | null;
}

export interface ParticipantJoinEvent {
  session_id: string;
  student_id: string;
  full_name: string;
  avatar_url?: string;
}

export interface ScoreUpdateEvent {
  session_id: string;
  student_id: string;
  new_score: number;
  correct_answers: number;
}

export interface AnswerRevealEvent {
  question_id: string;
  correct_option_id: string;
  explanation: string | null;
  stats: {
    total_answers: number;
    correct_count: number;
    option_distribution: Record<string, number>;
  };
}

// ============================================================
// UI STATE TYPES
// ============================================================

export interface QuizPlayerState {
  sessionId: string;
  currentQuestion: SafeQuestion | null;
  timeRemaining: number;
  hasAnswered: boolean;
  selectedOptionId: string | null;
  score: number;
  questionsAnswered: number;
}

export interface QuizHostState {
  sessionId: string;
  status: 'waiting' | 'live' | 'completed';
  currentQuestionIndex: number;
  totalQuestions: number;
  participants: ParticipantWithScore[];
  roomCode: string;
}

export interface ParticipantWithScore {
  student_id: string;
  full_name: string;
  avatar_url: string | null;
  section: string | null;
  score: number;
  correct_answers: number;
  rank: number;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Import SafeQuestion for QuizPlayerState
import type { SafeQuestion, GeneratedQuestion } from './database';
