import Link from "next/link";
import { GraduationCap, BookOpen, Trophy, Zap, Users, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: BookOpen,
    title: "Structured Learning",
    description: "Master DSA concepts with organized courseware.",
  },
  {
    icon: Zap,
    title: "Live Quizzes",
    description: "Real-time quizzes hosted by your teachers.",
  },
  {
    icon: Brain,
    title: "AI Questions",
    description: "Practice with AI-generated questions.",
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    description: "Compete and track your progress.",
  },
  {
    icon: Users,
    title: "Section Rankings",
    description: "Compare performance across sections.",
  },
  {
    icon: GraduationCap,
    title: "Assignments",
    description: "Submit solutions and get feedback.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span>DSA Platform</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 pt-28 pb-16">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Learn Data Structures & Algorithms
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            A platform for students to learn DSA, complete assignments, 
            and compete in live quizzes with classmates.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/signup">
              <Button size="lg">Start Learning</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">I have an account</Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-lg border bg-card hover:border-primary/50 transition-colors"
            >
              <feature.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-medium">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-24 p-8 rounded-lg border bg-secondary/50 text-center">
          <h2 className="text-xl font-semibold">Ready to start?</h2>
          <p className="mt-2 text-muted-foreground">
            Join students already learning on the platform.
          </p>
          <Link href="/signup">
            <Button className="mt-4">Create Free Account</Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 DSA Learning Platform
        </div>
      </footer>
    </div>
  );
}
