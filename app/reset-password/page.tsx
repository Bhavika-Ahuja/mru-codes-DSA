"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  BookOpen,
  Lock,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    // Handle password reset from Supabase email link
    const handlePasswordReset = async () => {
      try {
        // Check if there's a hash in the URL (from Supabase email)
        const hash = window.location.hash;
        
        if (hash) {
          // Extract the access token and refresh token from hash
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          // If this is a recovery email link, exchange tokens for session
          if (type === 'recovery' && accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              toast.error("Invalid or expired reset link");
              router.push("/forgot-password");
              return;
            }

            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname);
            setIsVerifying(false);
            return;
          }
        }

        // Check for existing session (user might have already authenticated)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setIsVerifying(false);
          return;
        }

        // No valid session or hash found
        toast.error("Invalid or expired reset link");
        router.push("/forgot-password");
      } catch (error) {
        console.error("Error handling password reset:", error);
        toast.error("Invalid or expired reset link");
        router.push("/forgot-password");
      }
    };

    handlePasswordReset();
  }, [supabase, router]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setIsSuccess(true);
      toast.success("Password reset successfully!");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/5 via-transparent to-primary/10 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                           linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="text-center mb-8 animate-[fade-in_0.5s_ease-out]">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Reset Password
            </h1>
            <p className="text-muted-foreground">
              {isSuccess
                ? "Your password has been reset successfully!"
                : "Enter your new password below"}
            </p>
          </div>

          {/* Reset Password Card */}
          <Card className="border-border/50 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/80 animate-[scale-in_0.3s_ease-out]">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <CardTitle className="text-xl">New Password</CardTitle>
              </div>
              <CardDescription>
                {isSuccess
                  ? "Redirecting to login..."
                  : "Choose a strong password for your account"}
              </CardDescription>
            </CardHeader>

            {isSuccess ? (
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-4 bg-green-500/10 rounded-full mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    Password Reset Successful!
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    Your password has been updated. You can now sign in with your
                    new password.
                  </p>
                  <Link href="/login" className="w-full">
                    <Button className="w-full">
                      Go to Login
                      <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-11 bg-background/50 border-border/50 pr-10"
                        {...register("password")}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-11 bg-background/50 border-border/50 pr-10"
                        {...register("confirmPassword")}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 pt-2">
                  <Button
                    type="submit"
                    className="w-full h-11 font-medium group"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting Password...
                      </>
                    ) : (
                      <>
                        Reset Password
                        <Lock className="ml-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                      </>
                    )}
                  </Button>
                  <Link href="/login" className="w-full">
                    <Button variant="ghost" className="w-full" type="button">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Login
                    </Button>
                  </Link>
                </CardFooter>
              </form>
            )}
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8 animate-[fade-in_0.5s_ease-out_0.3s_both]">
            Remember your password?{" "}
            <Link
              href="/login"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

