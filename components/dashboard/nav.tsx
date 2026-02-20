"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  Trophy,
  Zap,
  FileText,
  PlusCircle,
  BarChart3,
  Users,
  Database,
  Lightbulb,
  Shield,
  Clock,
  FileSpreadsheet,
  Code2,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

const studentNav = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/learn", label: "Learn", icon: BookOpen },
  { href: "/student/ide", label: "IDE", icon: Code2 },
  { href: "/student/quiz/join", label: "Join Quiz", icon: Zap },
  { href: "/student/study-recommendations", label: "Study Tips", icon: Lightbulb },
  { href: "/student/quiz-history", label: "Quiz History", icon: Clock },
  { href: "/student/assignments", label: "Assignments", icon: FileText },
  { href: "/student/performance", label: "My Performance", icon: BarChart3 },
  { href: "/student/leaderboard", label: "Leaderboard", icon: Trophy },
];

const teacherNav = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/quizzes", label: "My Quizzes", icon: Zap },
  { href: "/teacher/quizzes/create", label: "Create Quiz", icon: PlusCircle },
  { href: "/teacher/quiz-marks", label: "Quiz Marks", icon: Award },
  { href: "/teacher/learn-content", label: "Upload Content", icon: BookOpen },
  { href: "/teacher/question-bank", label: "Question Bank", icon: Database },
  { href: "/teacher/ide", label: "IDE", icon: Code2 },
  { href: "/teacher/cheating-detection", label: "Cheating Detection", icon: Shield },
  { href: "/teacher/assignments", label: "Assignments", icon: FileText },
  { href: "/teacher/performance", label: "Student Performance", icon: Users },
  { href: "/teacher/export-reports", label: "Export Reports", icon: FileSpreadsheet },
  { href: "/teacher/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function DashboardNav({ role }: { role: "student" | "teacher" }) {
  const pathname = usePathname();
  const navItems = role === "teacher" ? teacherNav : studentNav;

  return (
    <aside
      className={cn(
        "hidden lg:fixed lg:left-0 lg:top-14 lg:bottom-0 lg:z-40",
        "lg:flex lg:flex-col lg:w-56 lg:border-r lg:bg-secondary/30 lg:overflow-y-auto"
      )}
    >
      <nav className="flex flex-col p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
