"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function JoinQuizPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomCode.trim()) {
      toast.error("Please enter a room code");
      return;
    }

    setIsLoading(true);

    try {
      // First, check if the session exists
      const response = await fetch(
        `/api/sessions?roomCode=${roomCode.toUpperCase()}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Session not found");
      }

      // Navigate to the play page
      router.push(`/student/play/${data.session.id}`);
    } catch (error) {
      console.error("Error joining session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to find session"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert to uppercase and limit to 6 characters
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (value.length <= 6) {
      setRoomCode(value);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="border-primary/20">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-4">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Join Live Quiz</CardTitle>
          <CardDescription>
            Enter the room code shared by your teacher
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="roomCode">Room Code</Label>
              <Input
                id="roomCode"
                type="text"
                placeholder="Enter 6-character code"
                value={roomCode}
                onChange={handleCodeChange}
                className="h-14 text-center text-2xl font-mono tracking-widest uppercase"
                maxLength={6}
                autoComplete="off"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full h-12"
              disabled={isLoading || roomCode.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Finding Quiz...
                </>
              ) : (
                <>
                  Join Quiz
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Tip:</strong> The room code is displayed on your
              teacher&apos;s screen. It&apos;s a 6-character code like{" "}
              <span className="font-mono">ABC123</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

