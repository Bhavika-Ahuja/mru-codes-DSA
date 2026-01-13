"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, BookOpen, Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
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
import toast from "react-hot-toast";

const forgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const supabase = createClient();

    const {
        register,
        handleSubmit,
        formState: { errors },
        getValues,
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                toast.error(error.message);
                return;
            }

            setIsSuccess(true);
            toast.success("Password reset email sent! Check your inbox.");
        } catch {
            toast.error("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-linear-to-br from-primary/5 via-transparent to-primary/10 rounded-full blur-3xl" />
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
                            Forgot Password?
                        </h1>
                        <p className="text-muted-foreground">
                            No worries! We&apos;ll send you reset instructions
                        </p>
                    </div>

                    {/* Forgot Password Card */}
                    <Card className="border-border/50 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/80 animate-[scale-in_0.3s_ease-out]">
                        <CardHeader className="space-y-1 pb-4">
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-primary" />
                                <CardTitle className="text-xl">Reset Password</CardTitle>
                            </div>
                            <CardDescription>
                                {isSuccess
                                    ? "Check your email for reset instructions"
                                    : "Enter your email address and we'll send you a link to reset your password"}
                            </CardDescription>
                        </CardHeader>

                        {isSuccess ? (
                            <CardContent className="space-y-6">
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <div className="p-4 bg-green-500/10 rounded-full mb-4">
                                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-2">Email Sent!</h3>
                                    <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                                        We&apos;ve sent password reset instructions to{" "}
                                        <span className="font-medium text-foreground">
                                            {getValues("email")}
                                        </span>
                                    </p>
                                    <p className="text-xs text-muted-foreground mb-6">
                                        Didn&apos;t receive the email? Check your spam folder or try
                                        again.
                                    </p>
                                    <div className="flex flex-col gap-3 w-full">
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsSuccess(false)}
                                            className="w-full"
                                        >
                                            Send Another Email
                                        </Button>
                                        <Link href="/login" className="w-full">
                                            <Button variant="ghost" className="w-full">
                                                <ArrowLeft className="h-4 w-4 mr-2" />
                                                Back to Login
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)}>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            className="h-11 bg-background/50 border-border/50"
                                            {...register("email")}
                                            disabled={isLoading}
                                        />
                                        {errors.email && (
                                            <p className="text-sm text-destructive flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                {errors.email.message}
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
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                Send Reset Link
                                                <Mail className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
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

