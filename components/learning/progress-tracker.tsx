"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ProgressTrackerProps {
  contentId: string;
  initialCompleted?: boolean;
  onProgressUpdate?: (completed: boolean) => void;
}

export function ProgressTracker({
  contentId,
  initialCompleted = false,
  onProgressUpdate,
}: ProgressTrackerProps) {
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setIsCompleted(initialCompleted);
  }, [initialCompleted]);

  async function toggleProgress() {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/learning-content/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          isCompleted: !isCompleted,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update progress");
      }

      setIsCompleted(!isCompleted);
      onProgressUpdate?.(!isCompleted);
      
      toast.success(
        !isCompleted
          ? "Marked as completed!"
          : "Marked as incomplete"
      );
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update progress"
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleProgress}
      disabled={isUpdating}
      className={isCompleted ? "border-green-500 text-green-600" : ""}
    >
      {isUpdating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : isCompleted ? (
        <CheckCircle2 className="h-4 w-4 mr-2" />
      ) : (
        <Circle className="h-4 w-4 mr-2" />
      )}
      {isCompleted ? "Completed" : "Mark as Complete"}
    </Button>
  );
}
