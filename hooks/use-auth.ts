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

    // Sign up with Supabase Auth
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
      toast.error(authError.message);
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

    // Refresh profile to get role
    await refreshProfile();
    
    toast.success("Welcome back!");
    
    // Redirect based on role
    if (authData.user) {
      const response = await fetch(`/api/profile/me`);
      if (response.ok) {
        const { profile: userProfile } = await response.json();
        if (userProfile?.role === "teacher") {
          router.push("/teacher/dashboard");
        } else {
          router.push("/student/dashboard");
        }
      } else {
        router.push("/dashboard");
      }
    }
    
    router.refresh();

    return { data: authData };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();

    return { error: null };
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
