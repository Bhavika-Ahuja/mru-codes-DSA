"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/user-store";

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

interface SupabaseContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
}

const SupabaseContext = createContext<SupabaseContextType>({
  user: null,
  profile: null,
  isLoading: true,
});

export function useSupabaseAuth() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error("useSupabaseAuth must be used within a SupabaseProvider");
  }
  return context;
}

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setProfile: setStoreProfile, setLoading } = useUserStore();
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (user) {
        // Fetch profile from API (which uses Prisma)
        const response = await fetch(`/api/profile/me`);
        if (response.ok) {
          const data = await response.json();
          setProfile(data.profile);
          setStoreProfile(data.profile);
        }
      }

      setIsLoading(false);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch profile from API
        const response = await fetch(`/api/profile/me`);
        if (response.ok) {
          const data = await response.json();
          setProfile(data.profile);
          setStoreProfile(data.profile);
        }
      } else {
        setProfile(null);
        setStoreProfile(null);
      }

      setIsLoading(false);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, setStoreProfile, setLoading]);

  return (
    <SupabaseContext.Provider value={{ user, profile, isLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
}
