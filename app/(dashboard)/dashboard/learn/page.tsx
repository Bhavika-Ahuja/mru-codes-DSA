import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, ChevronRight, Clock, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Placeholder data until we have real courses
const placeholderCourses = [
  {
    id: "1",
    title: "Arrays & Strings",
    description: "Master array manipulation and string algorithms",
    slug: "arrays-strings",
    icon: "📊",
    lessons: 8,
    completed: 5,
  },
  {
    id: "2",
    title: "Linked Lists",
    description: "Learn singly, doubly, and circular linked lists",
    slug: "linked-lists",
    icon: "🔗",
    lessons: 6,
    completed: 6,
  },
  {
    id: "3",
    title: "Stacks & Queues",
    description: "Understand LIFO and FIFO data structures",
    slug: "stacks-queues",
    icon: "📚",
    lessons: 5,
    completed: 3,
  },
  {
    id: "4",
    title: "Trees & BST",
    description: "Binary trees, BST, and tree traversals",
    slug: "trees-bst",
    icon: "🌳",
    lessons: 10,
    completed: 4,
  },
  {
    id: "5",
    title: "Graphs",
    description: "Graph representations and traversal algorithms",
    slug: "graphs",
    icon: "🕸️",
    lessons: 12,
    completed: 2,
  },
  {
    id: "6",
    title: "Dynamic Programming",
    description: "Optimize problems with memoization and tabulation",
    slug: "dynamic-programming",
    icon: "🧮",
    lessons: 15,
    completed: 0,
  },
  {
    id: "7",
    title: "Sorting Algorithms",
    description: "Master various sorting techniques and their complexities",
    slug: "sorting",
    icon: "📈",
    lessons: 8,
    completed: 0,
  },
  {
    id: "8",
    title: "Searching Algorithms",
    description: "Binary search, linear search, and advanced techniques",
    slug: "searching",
    icon: "🔍",
    lessons: 6,
    completed: 0,
  },
];

export default async function LearnPage() {
  // In production, fetch from database
  // const supabase = await createClient();
  // const { data: courses } = await supabase
  //   .from("courses")
  //   .select("*, lessons(count)")
  //   .order("order_index");

  const courses = placeholderCourses;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          Learn DSA
        </h1>
        <p className="text-muted-foreground mt-1">
          Explore structured courseware from basics to advanced topics
        </p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress
              value={
                (courses.reduce((acc: number, c) => acc + c.completed, 0) /
                  courses.reduce((acc: number, c) => acc + c.lessons, 0)) *
                100
              }
              className="flex-1 h-3"
            />
            <span className="text-sm font-medium">
              {courses.reduce((acc: number, c) => acc + c.completed, 0)} /{" "}
              {courses.reduce((acc: number, c) => acc + c.lessons, 0)} lessons
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Course Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const progress = (course.completed / course.lessons) * 100;
          const isCompleted = progress === 100;
          const isStarted = progress > 0;

          return (
            <Link key={course.id} href={`/dashboard/learn/${course.slug}`}>
              <Card className="h-full transition-all hover:shadow-md hover:-translate-y-1 cursor-pointer group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <span className="text-4xl">{course.icon}</span>
                    {isCompleted ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </Badge>
                    ) : isStarted ? (
                      <Badge variant="secondary">{Math.round(progress)}%</Badge>
                    ) : (
                      <Badge variant="outline">Not started</Badge>
                    )}
                  </div>
                  <CardTitle className="mt-4 group-hover:text-primary transition-colors">
                    {course.title}
                  </CardTitle>
                  <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {course.lessons} lessons
                      </span>
                      <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
                        Continue
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

