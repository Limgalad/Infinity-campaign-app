"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Invisible component that subscribes to Supabase realtime changes
 * on game_results for the given chapter IDs and triggers a Next.js
 * router refresh when data changes. Use this in server component pages
 * to get live updates without converting to client components.
 */
export function RealtimeRefresh({ chapterIds }: { chapterIds: string[] }) {
  const router = useRouter();

  useEffect(() => {
    if (chapterIds.length === 0) return;

    const supabase = createClient();
    const channels: ReturnType<typeof supabase.channel>[] = [];

    for (const chapterId of chapterIds) {
      const channel = supabase
        .channel(`live_${chapterId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "game_results",
            filter: `chapter_id=eq.${chapterId}`,
          },
          () => {
            router.refresh();
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
  }, [chapterIds.join(","), router]);

  return null;
}
