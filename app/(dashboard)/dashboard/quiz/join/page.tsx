"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2 } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export default function JoinQuizPage() {
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomCode.trim()) {
      toast.error("Please enter a room code");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to join a quiz");
      return;
    }

    setIsJoining(true);

    try {
      // Find the session by room code
      const { data: session, error: sessionError } = await supabase
        .from("quiz_sessions")
        .select("id, status")
        .eq("room_code", roomCode.toUpperCase())
        .single();

      if (sessionError || !session) {
        toast.error("Room not found. Check the code and try again.");
        return;
      }

      if (session.status === "completed") {
        toast.error("This quiz session has already ended");
        return;
      }

      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from("session_participants")
        .select("id")
        .eq("session_id", session.id)
        .eq("user_id", user.id)
        .single();

      if (!existingParticipant) {
        // Join the session
        const { error: joinError } = await supabase
          .from("session_participants")
          .insert({
            session_id: session.id,
            user_id: user.id,
          });

        if (joinError) {
          toast.error("Failed to join the quiz session");
          return;
        }
      }

      toast.success("Joined successfully!");
      router.push(`/dashboard/quiz/play/${session.id}`);
    } catch (error) {
      console.error("Error joining quiz:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Zap className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Join Live Quiz</h1>
        <p className="text-muted-foreground mt-2">
          Enter the room code shared by your teacher
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enter Room Code</CardTitle>
          <CardDescription>
            The code is usually 6 characters (letters and numbers)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomCode">Room Code</Label>
              <Input
                id="roomCode"
                placeholder="e.g., ABC123"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="text-center text-2xl font-mono tracking-widest h-14"
                maxLength={6}
                disabled={isJoining}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isJoining || roomCode.length < 4}
            >
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Join Quiz
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 p-4 rounded-lg bg-muted/50 text-center">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Tip:</strong> Make sure your teacher has started the quiz
          session before joining.
        </p>
      </div>
    </div>
  );
}

