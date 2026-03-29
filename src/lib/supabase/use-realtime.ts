"use client";

import { useEffect } from "react";
import { createClient } from "./client";

/**
 * Subscribe to Supabase realtime changes on a table.
 * Calls `onUpdate` whenever an INSERT, UPDATE, or DELETE occurs
 * on rows matching the given filter.
 */
export function useRealtimeTable(
  table: string,
  filter: { column: string; value: string } | null,
  onUpdate: () => void
) {
  useEffect(() => {
    if (!filter) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`${table}_${filter.value}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `${filter.column}=eq.${filter.value}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter?.column, filter?.value]);
}

/**
 * Subscribe to multiple tables for a campaign.
 * Useful for leaderboard/standings that depend on game_results.
 */
export function useCampaignRealtime(
  campaignId: string,
  chapterIds: string[],
  onUpdate: () => void
) {
  useEffect(() => {
    if (!campaignId || chapterIds.length === 0) return;

    const supabase = createClient();
    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Subscribe to game_results changes for each chapter
    for (const chapterId of chapterIds) {
      const channel = supabase
        .channel(`game_results_${chapterId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "game_results",
            filter: `chapter_id=eq.${chapterId}`,
          },
          () => {
            onUpdate();
          }
        )
        .subscribe();
      channels.push(channel);
    }

    return () => {
      for (const ch of channels) {
        supabase.removeChannel(ch);
      }
    };
  }, [campaignId, chapterIds.join(",")]);
}
