/**
 * Database Types for DSA Learning Platform
 * Generated based on supabase/schema.sql
 * 
 * To regenerate using Supabase CLI:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
 */

// ============================================================
// ENUMS
// ============================================================

export type UserRole = 'student' | 'teacher';
export type QuizStatus = 'draft' | 'published' | 'archived';
export type SessionStatus = 'waiting' | 'live' | 'completed';
export type QuestionType = 'mcq' | 'code' | 'true_false';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// ============================================================
// JSON TYPES
// ============================================================

/** MCQ Option structure stored in JSONB */
export interface QuestionOption {
  id: string;           // e.g., 'a', 'b', 'c', 'd'
  text: string;         // The option text
  is_correct: boolean;  // Whether this is the correct answer
}

/** Safe option (without is_correct) for student view */
export interface SafeQuestionOption {
  id: string;
  text: string;
}

// ============================================================
// TABLE TYPES
// ============================================================

/** Profile - User profile linked to auth.users */
export interface Profile {
  id: string;                    // UUID, references auth.users
  email: string;
  full_name: string;
  roll_number: string | null;
  section: string | null;        // e.g., 'A', 'B', 'C'
  role: UserRole;
  avatar_url: string | null;
  total_score: number;
  quizzes_taken: number;
  created_at: string;            // ISO timestamp
  updated_at: string;
}

/** Quiz - Quiz metadata */
export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  topic: string;                 // DSA topic
  difficulty: DifficultyLevel;
  time_per_question: number;     // seconds
  created_by: string;            // UUID, FK to profiles
  status: QuizStatus;
  total_questions: number;
  created_at: string;
  updated_at: string;
}

/** Question - Quiz question with JSONB options */
export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: QuestionType;
  points: number;
  time_limit: number | null;     // Optional per-question override
  order_index: number;
  options: QuestionOption[];     // JSONB array
  code_template: string | null;  // For code questions
  explanation: string | null;    // Shown after answering
  created_at: string;
}

/** Safe Question - For student view (no correct answers) */
export interface SafeQuestion {
  id: string;
  question_text: string;
  question_type: QuestionType;
  points: number;
  time_limit: number | null;
  order_index: number;
  options: SafeQuestionOption[];
}

/** Quiz Session - Live quiz state management */
export interface QuizSession {
  id: string;
  quiz_id: string;
  host_id: string;               // Teacher's profile ID
  room_code: string;             // 6-char join code
  status: SessionStatus;
  current_question_id: string | null;
  current_question_index: number;
  question_started_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

/** Session Participant - Student in a live session */
export interface SessionParticipant {
  id: string;
  session_id: string;
  student_id: string;
  session_score: number;
  questions_answered: number;
  correct_answers: number;
  joined_at: string;
}

/** Submission - Student answer record */
export interface Submission {
  id: string;
  session_id: string;
  question_id: string;
  student_id: string;
  selected_option_id: string | null;
  answer_text: string | null;    // For code/text questions
  is_correct: boolean;
  score: number;
  time_taken: number | null;     // Seconds
  submitted_at: string;
}

// ============================================================
// VIEW TYPES (Leaderboards)
// ============================================================

/** Global Leaderboard Entry */
export interface LeaderboardGlobal {
  student_id: string;
  full_name: string;
  roll_number: string | null;
  section: string | null;
  avatar_url: string | null;
  total_score: number;
  quizzes_participated: number;
  total_questions_answered: number;
  correct_answers: number;
  accuracy_percentage: number;
  global_rank: number;
}

/** Section Leaderboard Entry */
export interface LeaderboardBySection {
  student_id: string;
  full_name: string;
  roll_number: string | null;
  section: string | null;
  avatar_url: string | null;
  total_score: number;
  quizzes_participated: number;
  correct_answers: number;
  section_rank: number;
  global_rank: number;
}

/** Session Leaderboard Entry (Live) */
export interface LeaderboardSession {
  session_id: string;
  student_id: string;
  full_name: string;
  section: string | null;
  avatar_url: string | null;
  session_score: number;
  questions_answered: number;
  correct_answers: number;
  accuracy: number;
  session_rank: number;
}

// ============================================================
// INSERT/UPDATE TYPES
// ============================================================

export interface ProfileInsert {
  id: string;
  email: string;
  full_name: string;
  roll_number?: string | null;
  section?: string | null;
  role?: UserRole;
  avatar_url?: string | null;
}

export interface ProfileUpdate {
  full_name?: string;
  roll_number?: string | null;
  section?: string | null;
  avatar_url?: string | null;
}

export interface QuizInsert {
  title: string;
  description?: string | null;
  topic: string;
  difficulty?: DifficultyLevel;
  time_per_question?: number;
  created_by: string;
  status?: QuizStatus;
}

export interface QuizUpdate {
  title?: string;
  description?: string | null;
  topic?: string;
  difficulty?: DifficultyLevel;
  time_per_question?: number;
  status?: QuizStatus;
}

export interface QuestionInsert {
  quiz_id: string;
  question_text: string;
  question_type?: QuestionType;
  points?: number;
  time_limit?: number | null;
  order_index?: number;
  options: QuestionOption[];
  code_template?: string | null;
  explanation?: string | null;
}

export interface QuestionUpdate {
  question_text?: string;
  question_type?: QuestionType;
  points?: number;
  time_limit?: number | null;
  order_index?: number;
  options?: QuestionOption[];
  code_template?: string | null;
  explanation?: string | null;
}

export interface QuizSessionInsert {
  quiz_id: string;
  host_id: string;
  room_code: string;
  status?: SessionStatus;
}

export interface QuizSessionUpdate {
  status?: SessionStatus;
  current_question_id?: string | null;
  current_question_index?: number;
  question_started_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface SessionParticipantInsert {
  session_id: string;
  student_id: string;
}

export interface SubmissionInsert {
  session_id: string;
  question_id: string;
  student_id: string;
  selected_option_id?: string | null;
  answer_text?: string | null;
  is_correct?: boolean;
  score?: number;
  time_taken?: number | null;
}

// ============================================================
// SUPABASE DATABASE TYPE (for typed client)
// ============================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      quizzes: {
        Row: Quiz;
        Insert: QuizInsert;
        Update: QuizUpdate;
      };
      questions: {
        Row: Question;
        Insert: QuestionInsert;
        Update: QuestionUpdate;
      };
      quiz_sessions: {
        Row: QuizSession;
        Insert: QuizSessionInsert;
        Update: QuizSessionUpdate;
      };
      session_participants: {
        Row: SessionParticipant;
        Insert: SessionParticipantInsert;
        Update: Partial<SessionParticipant>;
      };
      submissions: {
        Row: Submission;
        Insert: SubmissionInsert;
        Update: Partial<Submission>;
      };
    };
    Views: {
      leaderboard_global: {
        Row: LeaderboardGlobal;
      };
      leaderboard_by_section: {
        Row: LeaderboardBySection;
      };
      leaderboard_session: {
        Row: LeaderboardSession;
      };
    };
    Functions: {
      get_session_question: {
        Args: {
          p_session_id: string;
          p_question_id: string;
        };
        Returns: SafeQuestion[];
      };
      submit_answer: {
        Args: {
          p_session_id: string;
          p_question_id: string;
          p_selected_option_id: string;
          p_time_taken?: number | null;
        };
        Returns: {
          is_correct: boolean;
          score: number;
          correct_option_id: string;
          explanation: string | null;
        }[];
      };
      generate_room_code: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      quiz_status: QuizStatus;
      session_status: SessionStatus;
      question_type: QuestionType;
      difficulty_level: DifficultyLevel;
    };
  };
}

// ============================================================
// EXTENDED TYPES (With Relations)
// ============================================================

/** Quiz with questions included */
export interface QuizWithQuestions extends Quiz {
  questions: Question[];
}

/** Quiz with creator profile */
export interface QuizWithCreator extends Quiz {
  creator: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

/** Session with full details */
export interface SessionWithDetails extends QuizSession {
  quiz: Quiz;
  host: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
  participants: SessionParticipantWithProfile[];
  current_question?: SafeQuestion | null;
}

/** Participant with profile info */
export interface SessionParticipantWithProfile extends SessionParticipant {
  profile: Pick<Profile, 'full_name' | 'avatar_url' | 'section' | 'roll_number'>;
}

/** Submission with question context */
export interface SubmissionWithQuestion extends Submission {
  question: Pick<Question, 'question_text' | 'points'>;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

/** Response from submit_answer function */
export interface SubmitAnswerResponse {
  is_correct: boolean;
  score: number;
  correct_option_id: string;
  explanation: string | null;
}

/** AI Generated Question (before saving) */
export interface GeneratedQuestion {
  question_text: string;
  options: {
    text: string;
    is_correct: boolean;
  }[];
  explanation: string;
}

// ============================================================
// HELPER TYPE UTILITIES
// ============================================================

/** Extract table row type */
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

/** Extract table insert type */
export type TablesInsert<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert'];

/** Extract table update type */
export type TablesUpdate<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update'];

/** Extract view row type */
export type Views<T extends keyof Database['public']['Views']> = 
  Database['public']['Views'][T]['Row'];

/** Extract enum type */
export type Enums<T extends keyof Database['public']['Enums']> = 
  Database['public']['Enums'][T];

