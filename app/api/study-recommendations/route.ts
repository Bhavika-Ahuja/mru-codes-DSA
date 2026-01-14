import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// GET: Get personalized study recommendations
export async function GET() {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "student") {
      return NextResponse.json(
        { error: "Only students can access recommendations" },
        { status: 403 }
      );
    }

    // Get all submissions for this student
    const submissions = await prisma.submission.findMany({
      where: {
        studentId: profile.id,
      },
      include: {
        question: {
          include: {
            quiz: {
              select: {
                topic: true,
                difficulty: true,
              },
            },
          },
        },
        session: {
          select: {
            id: true,
            quizId: true,
          },
        },
      },
    });

    // Calculate topic-wise performance
    const topicStats = new Map<
      string,
      { correct: number; total: number; totalScore: number; maxScore: number }
    >();

    submissions.forEach((sub) => {
      const topic = sub.question.quiz.topic;
      if (!topicStats.has(topic)) {
        topicStats.set(topic, { correct: 0, total: 0, totalScore: 0, maxScore: 0 });
      }
      const stats = topicStats.get(topic)!;
      stats.total += 1;
      stats.maxScore += sub.question.points;
      if (sub.isCorrect) {
        stats.correct += 1;
        stats.totalScore += sub.score;
      }
    });

    // Identify weak topics (accuracy < 60%)
    const weakTopics = Array.from(topicStats.entries())
      .map(([topic, stats]) => ({
        topic,
        accuracy: (stats.correct / stats.total) * 100,
        attempts: stats.total,
        avgScore: stats.totalScore / stats.total,
      }))
      .filter((t) => t.accuracy < 60)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    type RecommendationPriority = "low" | "medium" | "high";
    type Recommendation = {
      type: string;
      title: string;
      description: string;
      priority: RecommendationPriority;
      actionUrl: string;
      topic?: string;
      currentScore?: number;
      targetScore?: number;
    };

    // Generate recommendations
    const recommendations: Recommendation[] = [];

    // Weak topic recommendations
    weakTopics.forEach((topic) => {
      recommendations.push({
        type: "weak_topic",
        title: `Focus on ${topic.topic}`,
        description: `Your accuracy in ${topic.topic} is ${topic.accuracy.toFixed(1)}%. Practice more questions on this topic to improve.`,
        priority: topic.accuracy < 40 ? "high" : topic.accuracy < 50 ? "medium" : "low",
        actionUrl: `/student/learn?topic=${encodeURIComponent(topic.topic)}`,
        topic: topic.topic,
        currentScore: topic.accuracy,
        targetScore: 75,
      });
    });

    // Overall improvement recommendation
    const overallAccuracy =
      submissions.length > 0
        ? (submissions.filter((s) => s.isCorrect).length / submissions.length) * 100
        : 0;

    if (overallAccuracy < 70) {
      recommendations.push({
        type: "improvement",
        title: "Improve Overall Performance",
        description: `Your overall accuracy is ${overallAccuracy.toFixed(1)}%. Focus on practicing more questions across all topics.`,
        priority: overallAccuracy < 50 ? "high" : "medium",
        actionUrl: "/student/learn",
        currentScore: overallAccuracy,
        targetScore: 80,
      });
    }

    // Practice recommendation
    if (submissions.length < 10) {
      recommendations.push({
        type: "practice",
        title: "Practice More Quizzes",
        description: "You've completed fewer than 10 questions. Practice more to get better insights.",
        priority: "medium",
        actionUrl: "/student/quiz/join",
      });
    }

    // Achievement recommendation
    if (overallAccuracy >= 80 && submissions.length >= 20) {
      recommendations.push({
        type: "achievement",
        title: "Great Progress!",
        description: "You're performing excellently! Keep up the good work.",
        priority: "low",
      });
    }

    return NextResponse.json({
      success: true,
      recommendations: recommendations.slice(0, 10), // Limit to 10 recommendations
      weakTopics,
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}
