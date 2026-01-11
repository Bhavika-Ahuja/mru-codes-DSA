import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  Trophy,
  Zap,
  Users,
  Brain,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Target,
  Award,
  Clock,
  FileText,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: BookOpen,
    title: "Structured Learning",
    description: "Master DSA concepts with organized courseware and comprehensive study materials.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Zap,
    title: "Live Quizzes",
    description: "Real-time interactive quizzes hosted by your teachers with instant feedback.",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    icon: Brain,
    title: "AI-Powered Questions",
    description: "Practice with intelligent AI-generated questions tailored to your level.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    description: "Compete with peers and track your progress on dynamic leaderboards.",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: Users,
    title: "Section Rankings",
    description: "Compare performance across sections and see where you stand.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: FileText,
    title: "Assignments",
    description: "Submit solutions, receive detailed feedback, and improve continuously.",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
];

const stats = [
  { label: "Active Students", value: "500+", icon: Users },
  { label: "Quizzes Completed", value: "1000+", icon: CheckCircle2 },
  { label: "Assignments", value: "200+", icon: FileText },
  { label: "Success Rate", value: "95%", icon: Award },
];

const benefits = [
  {
    icon: Target,
    title: "Goal-Oriented Learning",
    description: "Set clear learning objectives and track your progress systematically.",
  },
  {
    icon: Clock,
    title: "Flexible Schedule",
    description: "Learn at your own pace with 24/7 access to all resources.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Get detailed insights into your strengths and areas for improvement.",
  },
  {
    icon: Sparkles,
    title: "Interactive Experience",
    description: "Engage with interactive quizzes and real-time feedback systems.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-colors" />
              <GraduationCap className="h-7 w-7 text-primary relative z-10 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight">DSA Learning Platform</span>
              <span className="text-xs text-muted-foreground leading-tight">Manav Rachna University</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button size="sm" className="cursor-pointer">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 pt-6">
        {/* Hero with Gradient Background */}
        <section className="relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-background to-primary/5" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.1),transparent_50%)]" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Manav Rachna University</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in">
                Master Data Structures &{" "}
                <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Algorithms
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in">
                A comprehensive learning platform designed for MRU students to excel in DSA through
                interactive quizzes, structured assignments, and real-time performance tracking.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col items-center justify-center gap-4 mb-16 animate-fade-in">
                <Link href="/login">
                  <Button size="lg" className="group cursor-pointer text-base px-8 py-6">
                    Continue to Platform
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground">
                  Already have an account? Sign in to access your dashboard
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-3xl mx-auto">
                {stats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className="p-4 rounded-xl border bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all hover:scale-105"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <stat.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                    <div className="text-2xl sm:text-3xl font-bold mb-1">{stat.value}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 sm:py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Everything You Need to{" "}
                <span className="text-primary">Excel</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed to enhance your learning experience and boost your performance.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="group relative p-6 sm:p-8 rounded-xl border bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`inline-flex p-3 rounded-lg ${feature.bgColor} mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Why Choose Our Platform?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Built specifically for Manav Rachna University students with cutting-edge features.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((benefit, index) => (
                <div
                  key={benefit.title}
                  className="text-center p-6 rounded-xl border bg-card hover:border-primary/50 transition-all hover:shadow-md"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
                    <benefit.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 sm:py-24 bg-linear-to-br from-primary/10 via-background to-primary/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="p-8 sm:p-12 rounded-2xl border bg-card/50 backdrop-blur-sm shadow-xl">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Start Your Journey?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join hundreds of MRU students already excelling in Data Structures & Algorithms.
                Start learning today and unlock your potential.
              </p>
              <div className="flex flex-col items-center justify-center gap-4">
                <Link href="/login">
                  <Button size="lg" className="group cursor-pointer text-base px-8 py-6">
                    Continue to Platform
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground">
                  Access your learning dashboard and continue your DSA journey
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div>
                <div className="font-semibold">DSA Learning Platform</div>
                <div className="text-sm text-muted-foreground">Manav Rachna University</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground text-center sm:text-right">
              <div>© {new Date().getFullYear()} Manav Rachna University. All rights reserved.</div>
              <div className="mt-1">
                Made by {" "}
                <span className="font-semibold text-foreground">Harsh Thakur</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
