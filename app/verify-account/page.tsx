"use client";

import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ArrowLeft,
  Mail,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function VerifyAccountPage() {
  return (
    <div className="min-h-dvh relative overflow-hidden bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-linear-to-br from-primary/5 via-transparent to-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                           linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative min-h-dvh flex items-start sm:items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-[fade-in_0.5s_ease-out]">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              DSA Learning Hub
            </h1>
            <p className="text-muted-foreground">
              Master data structures & algorithms
            </p>
          </div>

          <Card className="relative overflow-hidden border-border/50 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/80 animate-[scale-in_0.35s_ease-out] border-t-4 border-t-green-500/50">
            <CardContent className="space-y-0 pt-10 pb-10 px-6 sm:px-8">
              <div className="flex flex-col items-center justify-center text-center">
                <div
                  className="p-5 rounded-full mb-5 animate-[scale-in_0.4s_ease-out_0.1s_both]"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(142 71% 45% / 0.15), hsl(142 71% 45% / 0.05)",
                    boxShadow: "0 0 0 1px hsl(142 71% 45% / 0.2)",
                  }}
                >
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
                </div>
                <h2 className="font-bold text-xl mb-1.5 animate-[fade-in_0.5s_ease-out_0.15s_both]">
                  Account created. Verify it now!
                </h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6 animate-[fade-in_0.5s_ease-out_0.2s_both]">
                  Verify your account now — go to your email and click the
                  confirmation link.
                </p>

                <div
                  className="w-full rounded-xl border border-green-500/20 bg-green-500/5 p-4 mb-6 text-left animate-[fade-in_0.5s_ease-out_0.25s_both]"
                  style={{
                    boxShadow: "0 0 0 1px hsl(142 71% 45% / 0.08)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-green-500/10">
                      <Mail className="h-4 w-4 text-green-600 dark:text-green-500" />
                    </div>
                    <span className="font-semibold text-sm text-foreground">
                      Go to your email
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-10">
                    Open your inbox, find our message, and click &quot;Confirm
                    Email&quot;. It may take a few minutes—check spam if you
                    don&apos;t see it.
                  </p>
                </div>

                <p className="text-xs text-muted-foreground mb-6 animate-[fade-in_0.5s_ease-out_0.3s_both]">
                  After verifying, come back and sign in to start practicing.
                </p>

                <div className="flex flex-col gap-3 w-full animate-[fade-in_0.5s_ease-out_0.35s_both]">
                  <Button
                    asChild
                    className="w-full h-11 font-medium group rounded-xl"
                  >
                    <Link href="/login">
                      Go to Login
                      <ChevronRight className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </Button>
                  <Link href="/signup" className="w-full">
                    <Button
                      variant="ghost"
                      className="w-full h-10 text-muted-foreground hover:text-foreground rounded-xl"
                      type="button"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Signup
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-8 animate-[fade-in_0.5s_ease-out_0.4s_both]">
            Already verified?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
