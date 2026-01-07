"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// Profile type matching Prisma schema
export interface UserProfile {
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

interface UserContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch(`/api/profile/me`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        return data.profile;
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
    return null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile();
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        setUser(currentUser);

        if (currentUser) {
          await fetchProfile();
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile();
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  // Derived state
  const isTeacher = profile?.role === "teacher";
  const isStudent = profile?.role === "student";
  const isAuthenticated = !!user && !!profile;

  const value: UserContextType = {
    user,
    profile,
    isLoading,
    isTeacher,
    isStudent,
    isAuthenticated,
    refreshProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

