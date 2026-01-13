"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/providers/user-provider";
import { toast } from "sonner";
import type { SignupFormData, LoginFormData } from "@/types";

export function useAuth() {
  const router = useRouter();
  const supabase = createClient();
  const { user, profile, isLoading, isTeacher, isStudent, refreshProfile } = useUser();

  const signUp = async (data: SignupFormData) => {
    const { email, password, full_name, roll_number, section, role } = data;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          roll_number,
          section,
          role,
        },
      },
    });

    if (authError) {
      const code = (authError as { code?: string }).code;
      if (code === "user_already_exists") {
        toast.error("An account with this email already exists. Please sign in instead.");
      } else {
        toast.error(authError.message);
      }
      return { error: authError };
    }

    if (authData.user) {
      toast.success("Account created successfully! Please verify your email.");
      router.push("/login");
    }

    return { data: authData };
  };

  const signIn = async (data: LoginFormData) => {
    const { email, password } = data;

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    await refreshProfile();
    toast.success("Welcome back!");

    if (authData.user) {
      const response = await fetch(`/api/profile/me`);
      if (response.ok) {
        const { profile: userProfile } = await response.json();
        const dashboardPath =
          userProfile?.role === "teacher"
            ? "/teacher/dashboard"
            : "/student/dashboard";
        router.push(dashboardPath);
      } else {
        router.push("/dashboard");
      }
    }

    router.refresh();
    return { data: authData };
  };

  const signOut = async () => {
    try {
      if (typeof window !== "undefined") {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
        localStorage.removeItem("sb-auth-token");
        sessionStorage.clear();
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error(error.message);
        return { error };
      }

      if (typeof window !== "undefined") {
        localStorage.clear();
        setTimeout(() => {
          window.location.href = "/";
        }, 100);
      } else {
        router.push("/");
        router.refresh();
      }

      toast.success("Signed out successfully");
      return { error: null };
    } catch (error) {
      console.error("Error during sign out:", error);
      toast.error("Error signing out. Please try again.");
      return { error: error as Error };
    }
  };

  const forgotPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success("Password reset email sent! Check your inbox.");
    return { error: null };
  };

  return {
    user,
    profile,
    isLoading,
    isTeacher,
    isStudent,
    signUp,
    signIn,
    signOut,
    forgotPassword,
    refreshProfile,
  };
}
