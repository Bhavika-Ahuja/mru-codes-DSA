"use client";

import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type RealtimeCallback<T> = (payload: T) => void;

interface UseRealtimeOptions<T> {
  channel: string;
  event: string;
  onMessage: RealtimeCallback<T>;
}

export function useRealtime<T>({
  channel,
  event,
  onMessage,
}: UseRealtimeOptions<T>) {
  const supabase = createClient();

  useEffect(() => {
    const channelInstance: RealtimeChannel = supabase
      .channel(channel)
      .on("broadcast", { event }, (payload) => {
        onMessage(payload.payload as T);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelInstance);
    };
  }, [supabase, channel, event, onMessage]);
}

export function useQuizSessionRealtime(sessionId: string) {
  const supabase = createClient();

  const subscribeToSession = useCallback(
    (callbacks: {
      onQuestionChange?: (data: { question_index: number; started_at: string }) => void;
      onSessionEnd?: () => void;
      onParticipantJoin?: (data: { user_id: string; full_name: string }) => void;
      onScoreUpdate?: (data: { user_id: string; score: number }) => void;
    }) => {
      const channel = supabase
        .channel(`quiz-session-${sessionId}`)
        .on("broadcast", { event: "question_change" }, (payload) => {
          callbacks.onQuestionChange?.(payload.payload);
        })
        .on("broadcast", { event: "session_end" }, () => {
          callbacks.onSessionEnd?.();
        })
        .on("broadcast", { event: "participant_join" }, (payload) => {
          callbacks.onParticipantJoin?.(payload.payload);
        })
        .on("broadcast", { event: "score_update" }, (payload) => {
          callbacks.onScoreUpdate?.(payload.payload);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    [supabase, sessionId]
  );

  const broadcastQuestionChange = useCallback(
    async (questionIndex: number) => {
      const channel = supabase.channel(`quiz-session-${sessionId}`);
      await channel.subscribe();
      await channel.httpSend({
        type: "broadcast",
        event: "question_change",
        payload: {
          question_index: questionIndex,
          started_at: new Date().toISOString(),
        },
      });
    },
    [supabase, sessionId]
  );

  const broadcastSessionEnd = useCallback(async () => {
    const channel = supabase.channel(`quiz-session-${sessionId}`);
    await channel.subscribe();
    await channel.httpSend({
      type: "broadcast",
      event: "session_end",
      payload: {},
    });
  }, [supabase, sessionId]);

  const broadcastScoreUpdate = useCallback(
    async (userId: string, score: number) => {
      const channel = supabase.channel(`quiz-session-${sessionId}`);
      await channel.subscribe();
      await channel.httpSend({
        type: "broadcast",
        event: "score_update",
        payload: { user_id: userId, score },
      });
    },
    [supabase, sessionId]
  );

  return {
    subscribeToSession,
    broadcastQuestionChange,
    broadcastSessionEnd,
    broadcastScoreUpdate,
  };
}

