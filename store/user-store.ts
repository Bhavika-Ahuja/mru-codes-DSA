import { create } from "zustand";

// Profile type matching Prisma schema
interface Profile {
  id: string;
  email: string;
  fullName: string;
  rollNumber: string | null;
  section: string | null;
  role: "student" | "teacher";
  avatarUrl: string | null;
  totalScore: number;
  quizzesTaken: number;
  createdAt: string;
  updatedAt: string;
}

interface UserState {
  profile: Profile | null;
  isLoading: boolean;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  isLoading: true,

  setProfile: (profile) => set({ profile, isLoading: false }),

  setLoading: (loading) => set({ isLoading: loading }),

  clearUser: () => set({ profile: null, isLoading: false }),
}));
