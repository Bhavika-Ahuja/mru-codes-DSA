import { create } from "zustand";
import type { QuizSessionWithDetails, QuestionWithOptions } from "@/types";

interface QuizState {
  // Session state
  currentSession: QuizSessionWithDetails | null;
  currentQuestion: QuestionWithOptions | null;
  timeRemaining: number;
  hasAnswered: boolean;
  selectedOptionId: string | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setSession: (session: QuizSessionWithDetails | null) => void;
  setCurrentQuestion: (question: QuestionWithOptions | null) => void;
  setTimeRemaining: (time: number) => void;
  decrementTime: () => void;
  setHasAnswered: (answered: boolean) => void;
  setSelectedOption: (optionId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetQuizState: () => void;
}

const initialState = {
  currentSession: null,
  currentQuestion: null,
  timeRemaining: 0,
  hasAnswered: false,
  selectedOptionId: null,
  isLoading: false,
  error: null,
};

export const useQuizStore = create<QuizState>((set) => ({
  ...initialState,

  setSession: (session) => set({ currentSession: session }),

  setCurrentQuestion: (question) =>
    set({
      currentQuestion: question,
      hasAnswered: false,
      selectedOptionId: null,
    }),

  setTimeRemaining: (time) => set({ timeRemaining: time }),

  decrementTime: () =>
    set((state) => ({
      timeRemaining: Math.max(0, state.timeRemaining - 1),
    })),

  setHasAnswered: (answered) => set({ hasAnswered: answered }),

  setSelectedOption: (optionId) => set({ selectedOptionId: optionId }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  resetQuizState: () => set(initialState),
}));

