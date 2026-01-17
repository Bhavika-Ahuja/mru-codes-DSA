"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  Database,
  Lightbulb,
  Shield,
  Clock,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const studentNav = [
  { href: "/student/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/student/learn", label: "Learn", icon: BookOpen },
  { href: "/student/quiz/join", label: "Quiz", icon: Zap },
  { href: "/student/study-recommendations", label: "Tips", icon: Lightbulb },
  { href: "/student/quiz-history", label: "History", icon: Clock },
  { href: "/student/assignments", label: "Tasks", icon: FileText },
  { href: "/student/performance", label: "Performance", icon: BarChart3 },
  { href: "/student/leaderboard", label: "Rank", icon: Trophy },
];

const teacherNav = [
  { href: "/teacher/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/teacher/quizzes", label: "Quizzes", icon: Zap },
  { href: "/teacher/quizzes/create", label: "Create", icon: Zap },
  { href: "/teacher/question-bank", label: "Bank", icon: Database },
  { href: "/teacher/cheating-detection", label: "Security", icon: Shield },
  { href: "/teacher/assignments", label: "Tasks", icon: FileText },
  { href: "/teacher/performance", label: "Students", icon: Users },
  { href: "/teacher/export-reports", label: "Export", icon: FileSpreadsheet },
  { href: "/teacher/leaderboard", label: "Rank", icon: Trophy },
];

export function MobileNav({ role }: { role: "student" | "teacher" }) {
  const pathname = usePathname();
  const navItems = role === "teacher" ? teacherNav : studentNav;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);
  const [scrollHints, setScrollHints] = useState({ left: false, right: false });

  const updateScrollHints = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 2) {
      setScrollHints({ left: false, right: false });
      return;
    }

    setScrollHints({
      left: el.scrollLeft > 2,
      right: el.scrollLeft < maxScroll - 2,
    });
  }, []);

  // Scroll to active item on mount or pathname change
  useEffect(() => {
    if (activeItemRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeItem = activeItemRef.current;

      // Calculate scroll position to center the active item
      const containerWidth = container.offsetWidth;
      const itemLeft = activeItem.offsetLeft;
      const itemWidth = activeItem.offsetWidth;
      const scrollPosition = itemLeft - (containerWidth / 2) + (itemWidth / 2);

      container.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: "smooth",
      });
    }
    // After programmatic scroll, recompute hint state
    const t = window.setTimeout(updateScrollHints, 250);
    return () => window.clearTimeout(t);
  }, [pathname, updateScrollHints]);

  // Show subtle visual cues when the bar is horizontally scrollable
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const raf = window.requestAnimationFrame(() => updateScrollHints());
    const onScroll = () => updateScrollHints();
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => updateScrollHints());
    ro.observe(el);

    return () => {
      window.cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [navItems.length, updateScrollHints]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm lg:hidden safe-area-inset-bottom">
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide overscroll-x-contain"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollBehavior: "smooth",
          }}
        >
          <div className="flex items-center min-w-max py-2 px-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  ref={isActive ? activeItemRef : null}
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs min-w-[72px] shrink-0 transition-all duration-200 touch-manipulation",
                    "active:scale-95",
                    isActive ? "text-primary" : "text-muted-foreground active:text-primary"
                  )}
                  style={{
                    minHeight: "56px", // Better touch target
                  }}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0 transition-transform", isActive && "scale-110")} />
                  <span className="whitespace-nowrap text-[10px] leading-tight font-medium">
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Scroll cues (appear only when scrollable) */}
        {scrollHints.left && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-background/95 to-transparent flex items-center"
          >
            <ChevronLeft className="ml-1 h-4 w-4 text-muted-foreground/80 animate-pulse" />
          </div>
        )}
        {scrollHints.right && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-background/95 to-transparent flex items-center justify-end"
          >
            <ChevronRight className="mr-1 h-4 w-4 text-muted-foreground/80 animate-pulse" />
          </div>
        )}
      </div>
    </nav>
  );
}
