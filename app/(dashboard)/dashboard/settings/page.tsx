"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Hash,
  Building2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/providers/user-provider";
import { toast } from "sonner";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  rollNumber: z.string().optional().or(z.literal("")),
  section: z.string().optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { profile, refreshProfile } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.fullName || "",
      rollNumber: profile?.rollNumber || "",
      section: profile?.section || "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName || "",
        rollNumber: profile.rollNumber || "",
        section: profile.section || "",
      });
      setIsInitialLoading(false);
    }
  }, [profile, reset]);

  if (!profile) {
    router.push("/login");
    return null;
  }

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName,
          rollNumber: data.rollNumber || null,
          section: data.section || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      await refreshProfile();
      toast.success("Profile updated successfully!", {
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile", {
        icon: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and profile information
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your profile details. Changes will be saved to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Full Name
              </Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                {...register("fullName")}
                disabled={isLoading}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if you need to update
                your email.
              </p>
            </div>

            {/* Roll Number */}
            <div className="space-y-2">
              <Label htmlFor="rollNumber" className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                Roll Number
              </Label>
              <Input
                id="rollNumber"
                placeholder="Enter your roll number (optional)"
                {...register("rollNumber")}
                disabled={isLoading}
              />
              {errors.rollNumber && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.rollNumber.message}
                </p>
              )}
            </div>

            {/* Section */}
            <div className="space-y-2">
              <Label htmlFor="section" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Section
              </Label>
              <Input
                id="section"
                placeholder="Enter your section (optional)"
                {...register("section")}
                disabled={isLoading}
              />
              {errors.section && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.section.message}
                </p>
              )}
            </div>

            {/* Role (Read-only) */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={profile.role === "teacher" ? "Teacher" : "Student"}
                disabled
                className="bg-muted cursor-not-allowed capitalize"
              />
              <p className="text-xs text-muted-foreground">
                Your role cannot be changed.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={isLoading || !isDirty} className="gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

