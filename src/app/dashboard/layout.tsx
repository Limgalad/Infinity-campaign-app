import { getCurrentPlayer } from "@/lib/supabase/queries";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const player = await getCurrentPlayer();

  return (
    <DashboardShell
      playerName={player?.display_name ?? "Commander"}
      isAdmin={player?.role === "admin"}
    >
      {children}
    </DashboardShell>
  );
}
