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
  Shield,
  Settings as SettingsIcon,
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
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/providers/user-provider";
import toast from "react-hot-toast";
import { TEACHER_DEPARTMENT_OPTIONS } from "@/lib/departments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  rollNumber: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
  section: z.string().optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function TeacherSettingsPage() {
  const { profile, refreshProfile } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.fullName || "",
      rollNumber: profile?.rollNumber || "",
      department: profile?.department || "",
      section: profile?.section || "",
    },
  });

  const selectedDepartment = watch("department");

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName || "",
        rollNumber: profile.rollNumber || "",
        department: profile.department || "",
        section: profile.section || "",
      });
      setIsInitialLoading(false);
    }
  }, [profile, reset]);

  if (!profile || profile.role !== "teacher") {
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
          department: data.department || null,
          // Teachers are never tied to a section; clear any legacy value.
          section: null,
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
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update profile",
        {
          icon: <AlertCircle className="h-4 w-4" />,
        }
      );
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
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Settings Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SettingsIcon className="h-5 w-5" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Profile</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Settings Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your profile details. Changes will be saved to your
                  account.
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
                    className="h-11"
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.fullName.message}
                    </p>
                  )}
                </div>

                <Separator />

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
                    className="bg-muted cursor-not-allowed h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support if you need to
                    update your email.
                  </p>
                </div>

                <Separator />

                {/* Department */}
                <div className="space-y-2">
                  <Label htmlFor="department" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Department
                  </Label>
                  <Select
                    value={selectedDepartment}
                    onValueChange={(value) => {
                      // Teachers are never tied to a section.
                      setValue("department", value, { shouldValidate: true });
                      setValue("section", "", { shouldValidate: true });
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEACHER_DEPARTMENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Roll Number */}
                <div className="space-y-2">
                  <Label
                    htmlFor="rollNumber"
                    className="flex items-center gap-2"
                  >
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    Roll Number
                  </Label>
                  <Input
                    id="rollNumber"
                    placeholder="Enter your roll number (optional)"
                    {...register("rollNumber")}
                    disabled={isLoading}
                    className="h-11"
                  />
                  {errors.rollNumber && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.rollNumber.message}
                    </p>
                  )}
                </div>

              </CardContent>
            </Card>

            {/* Account Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Account Details
                </CardTitle>
                <CardDescription>
                  Information about your account that cannot be changed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label>Role</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your account type
                    </p>
                  </div>
                  <Input
                    value="Teacher"
                    disabled
                    className="bg-muted cursor-not-allowed w-32 capitalize h-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isLoading || !isDirty}
                className="gap-2 min-w-[140px]"
                size="lg"
              >
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
          </div>
        </div>
      </form>
    </div>
  );
}
