import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// POST: Seed initial courses (only run once)
export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can seed courses" },
        { status: 403 }
      );
    }

    // Check if courses already exist
    const existingCourses = await prisma.course.count();
    if (existingCourses > 0) {
      return NextResponse.json({
        success: true,
        message: "Courses already exist",
        count: existingCourses,
      });
    }

    // Seed initial courses
    const courses = [
      {
        title: "Arrays & Strings",
        description: "Master array manipulation and string algorithms",
        slug: "arrays-strings",
        icon: "📊",
        orderIndex: 0,
        status: "published" as const,
      },
      {
        title: "Linked Lists",
        description: "Learn singly, doubly, and circular linked lists",
        slug: "linked-lists",
        icon: "🔗",
        orderIndex: 1,
        status: "published" as const,
      },
      {
        title: "Stacks & Queues",
        description: "Understand LIFO and FIFO data structures",
        slug: "stacks-queues",
        icon: "📚",
        orderIndex: 2,
        status: "published" as const,
      },
      {
        title: "Trees & BST",
        description: "Binary trees, BST, and tree traversals",
        slug: "trees-bst",
        icon: "🌳",
        orderIndex: 3,
        status: "published" as const,
      },
      {
        title: "Graphs",
        description: "Graph representations and traversal algorithms",
        slug: "graphs",
        icon: "🕸️",
        orderIndex: 4,
        status: "published" as const,
      },
      {
        title: "Dynamic Programming",
        description: "Optimize problems with memoization and tabulation",
        slug: "dynamic-programming",
        icon: "🧮",
        orderIndex: 5,
        status: "published" as const,
      },
      {
        title: "Sorting Algorithms",
        description: "Master various sorting techniques and their complexities",
        slug: "sorting",
        icon: "📈",
        orderIndex: 6,
        status: "published" as const,
      },
      {
        title: "Searching Algorithms",
        description: "Binary search, linear search, and advanced techniques",
        slug: "searching",
        icon: "🔍",
        orderIndex: 7,
        status: "published" as const,
      },
    ];

    const createdCourses = await prisma.course.createMany({
      data: courses,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${createdCourses.count} courses`,
      count: createdCourses.count,
    });
  } catch (error) {
    console.error("Error seeding courses:", error);
    return NextResponse.json(
      { error: "Failed to seed courses" },
      { status: 500 }
    );
  }
}
