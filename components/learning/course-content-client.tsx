"use client";

import { useState, useEffect } from "react";
import { FileText, Video, Presentation, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContentViewer } from "@/components/learning/content-viewer";
import { ProgressTracker } from "@/components/learning/progress-tracker";

interface LearningContent {
  id: string;
  title: string;
  description: string | null;
  contentType: "pdf" | "ppt" | "video" | "document" | "other";
  contentUrl: string;
  fileName: string | null;
  orderIndex: number;
}

interface CourseContentClientProps {
  courseId: string;
  content: LearningContent[];
}

export function CourseContentClient({
  courseId,
  content,
}: CourseContentClientProps) {
  const [progress, setProgress] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, [courseId]);

  async function fetchProgress() {
    try {
      const response = await fetch(
        `/api/learning-content/progress?courseId=${courseId}`
      );
      const data = await response.json();

      if (data.success && data.progress) {
        const progressMap = new Map<string, boolean>();
        Object.entries(data.progress).forEach(([contentId, prog]: [string, any]) => {
          progressMap.set(contentId, prog.isCompleted || false);
        });
        setProgress(progressMap);
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsViewed(contentId: string) {
    // Automatically mark as viewed when content is opened
    try {
      await fetch("/api/learning-content/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          isCompleted: false,
        }),
      });
    } catch (error) {
      console.error("Error marking as viewed:", error);
    }
  }

  function handleProgressUpdate(contentId: string, completed: boolean) {
    setProgress((prev) => {
      const newMap = new Map(prev);
      newMap.set(contentId, completed);
      return newMap;
    });
  }

  function getContentTypeIcon(type: string) {
    switch (type) {
      case "pdf":
        return <FileText className="h-5 w-5" />;
      case "ppt":
        return <Presentation className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  }

  function isGoogleDriveUrl(url: string): boolean {
    return url.includes("drive.google.com");
  }

  function isYouTubeUrl(url: string): boolean {
    return url.includes("youtube.com") || url.includes("youtu.be");
  }

  const completedCount = Array.from(progress.values()).filter(Boolean).length;
  const totalCount = content.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      {totalCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>
              Track your learning progress for this course
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {completedCount} of {totalCount} items completed
                </span>
                <span className="font-semibold">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content List */}
      <div className="space-y-4">
        {content.map((item) => {
          const isCompleted = progress.get(item.id) || false;

          return (
            <Card
              key={item.id}
              className={`border-border/50 ${
                isCompleted ? "bg-green-50/50 dark:bg-green-950/10" : ""
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getContentTypeIcon(item.contentType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        {isCompleted && (
                          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                            Completed
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <CardDescription className="mt-1">
                          {item.description}
                        </CardDescription>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline">
                          {item.contentType.toUpperCase()}
                        </Badge>
                        {item.fileName && (
                          <span className="text-xs text-muted-foreground">
                            {item.fileName}
                          </span>
                        )}
                        {isGoogleDriveUrl(item.contentUrl) && (
                          <Badge variant="secondary" className="text-xs">
                            Google Drive
                          </Badge>
                        )}
                        {isYouTubeUrl(item.contentUrl) && (
                          <Badge variant="secondary" className="text-xs">
                            YouTube
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  <ContentViewer
                    content={item}
                    onView={() => markAsViewed(item.id)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={item.contentUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Link
                    </a>
                  </Button>
                  <ProgressTracker
                    contentId={item.id}
                    initialCompleted={isCompleted}
                    onProgressUpdate={(completed) =>
                      handleProgressUpdate(item.id, completed)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
