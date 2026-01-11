"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  Trophy,
  Zap,
  FileText,
  BarChart3,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const studentNav = [
  { href: "/student/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/student/learn", label: "Learn", icon: BookOpen },
  { href: "/student/quiz/join", label: "Quiz", icon: Zap },
  { href: "/student/assignments", label: "Tasks", icon: FileText },
  { href: "/student/performance", label: "Performance", icon: BarChart3 },
  { href: "/student/leaderboard", label: "Rank", icon: Trophy },
];

const teacherNav = [
  { href: "/teacher/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/teacher/quizzes", label: "Quizzes", icon: Zap },
  { href: "/teacher/quizzes/create", label: "Create", icon: Zap },
  { href: "/teacher/assignments", label: "Tasks", icon: FileText },
  { href: "/teacher/performance", label: "Students", icon: Users },
  { href: "/teacher/leaderboard", label: "Rank", icon: Trophy },
];

export function MobileNav({ role }: { role: "student" | "teacher" }) {
  const pathname = usePathname();
  const navItems = role === "teacher" ? teacherNav : studentNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 text-xs",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
