"use client";

import { useEffect, useState } from "react";
import {
  Target,
  TrendingUp,
  BookOpen,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Clock,
  Award,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Recommendation {
  type: "weak_topic" | "improvement" | "practice" | "achievement";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  actionUrl?: string;
  topic?: string;
  currentScore?: number;
  targetScore?: number;
}

interface WeakTopic {
  topic: string;
  accuracy: number;
  attempts: number;
  avgScore: number;
}

export default function StudyRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch("/api/study-recommendations");
      const data = await response.json();
      if (response.ok) {
        setRecommendations(data.recommendations || []);
        setWeakTopics(data.weakTopics || []);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "weak_topic":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "improvement":
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case "practice":
        return <BookOpen className="h-5 w-5 text-amber-500" />;
      case "achievement":
        return <Award className="h-5 w-5 text-green-500" />;
      default:
        return <Lightbulb className="h-5 w-5 text-primary" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-500/50 bg-red-500/5";
      case "medium":
        return "border-amber-500/50 bg-amber-500/5";
      case "low":
        return "border-blue-500/50 bg-blue-500/5";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Study Recommendations</h1>
        <p className="text-muted-foreground mt-1">
          Personalized learning insights based on your performance
        </p>
      </div>

      {/* Weak Topics */}
      {weakTopics.length > 0 && (
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-red-500" />
              Weak Topics - Focus Areas
            </CardTitle>
            <CardDescription>
              Topics where you need more practice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {weakTopics.map((topic) => (
              <div key={topic.topic} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{topic.topic}</span>
                  <Badge variant="outline" className="text-red-600">
                    {topic.accuracy.toFixed(1)}% accuracy
                  </Badge>
                </div>
                <Progress value={topic.accuracy} className="h-2" />
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {topic.attempts} attempts
                  </span>
                  <span>Avg Score: {topic.avgScore.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading recommendations...</p>
            </CardContent>
          </Card>
        ) : recommendations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
              <p className="text-muted-foreground">No recommendations at this time</p>
              <p className="text-sm text-muted-foreground mt-2">
                Keep practicing to get personalized recommendations!
              </p>
            </CardContent>
          </Card>
        ) : (
          recommendations.map((rec, idx) => (
            <Card
              key={idx}
              className={`hover:border-primary/30 transition-colors ${getPriorityColor(rec.priority)}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getRecommendationIcon(rec.type)}
                    <div>
                      <CardTitle className="text-lg">{rec.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {rec.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      rec.priority === "high"
                        ? "border-red-500 text-red-600"
                        : rec.priority === "medium"
                        ? "border-amber-500 text-amber-600"
                        : "border-blue-500 text-blue-600"
                    }
                  >
                    {rec.priority} priority
                  </Badge>
                </div>
              </CardHeader>
              {rec.currentScore !== undefined && rec.targetScore !== undefined && (
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Current: {rec.currentScore}%</span>
                      <span>Target: {rec.targetScore}%</span>
                    </div>
                    <Progress
                      value={(rec.currentScore / rec.targetScore) * 100}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              )}
              {rec.actionUrl && (
                <CardContent>
                  <Link href={rec.actionUrl}>
                    <Button variant="outline" className="w-full">
                      Take Action
                    </Button>
                  </Link>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
