"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { updatePlayer } from "../actions";
import { useToast } from "@/components/toast";
import type { Player } from "@/lib/types/database";

const FACTIONS = [
  "PanOceania", "Yu Jing", "Ariadna", "Haqqislam", "Nomads",
  "Combined Army", "ALEPH", "Tohaa", "O-12", "NA2",
];

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  async function loadPlayers() {
    const supabase = createClient();
    const { data } = await supabase
      .from("players")
      .select("*")
      .order("display_name");
    setPlayers((data as Player[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadPlayers();
  }, []);

  async function handleUpdate(formData: FormData) {
    const result = await updatePlayer(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Player updated");
      setEditingId(null);
      loadPlayers();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-2 h-2 bg-cyan rounded-full status-dot" />
        <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary ml-3">
          Loading players...
        </span>
      </div>
    );
  }

  return (
    <div style={{ animation: "slide-up 0.5s ease-out" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary">
          {players.length} player{players.length !== 1 ? "s" : ""} registered
        </span>
      </div>

      {/* Table header */}
      <div className="hidden md:flex items-center px-5 py-2 mb-1">
        <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-8">#</span>
        <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted flex-1">NAME</span>
        <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-36">FACTION</span>
        <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-28">SECTORIAL</span>
        <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-20">ROLE</span>
        <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-40 text-right">ACTIONS</span>
      </div>

      {/* Player list */}
      <div className="space-y-2">
        {players.map((player, i) => (
          <div key={player.id}>
            {editingId === player.id ? (
              <PlayerEditForm
                player={player}
                onSubmit={handleUpdate}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="panel px-5 py-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-0">
                <span className="font-[family-name:var(--font-mono)] text-sm text-text-muted w-8 hidden md:block">
                  {i + 1}
                </span>
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-7 h-7 bg-surface-bright border border-border flex items-center justify-center shrink-0">
                    <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                      {player.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary">
                    {player.display_name}
                  </span>
                </div>
                <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary w-36">
                  {player.faction ?? "—"}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary w-28">
                  {player.sectorial ?? "—"}
                </span>
                <span className="w-20">
                  {player.role === "admin" ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-red/10 border border-red-dim/30 text-red font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase">
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 bg-surface border border-border text-text-secondary font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase">
                      Player
                    </span>
                  )}
                </span>
                <div className="w-40 flex justify-end gap-2">
                  <Link
                    href={`/dashboard/admin/players/${player.id}`}
                    className="px-3 py-1.5 border border-cyan-dim/40 text-cyan hover:bg-cyan/10 hover:border-cyan-dim font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => {
                      setEditingId(player.id);
                    }}
                    className="px-3 py-1.5 border border-border text-text-secondary hover:text-amber hover:border-amber-dim font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {players.length === 0 && (
          <div className="panel p-8 text-center">
            <p className="font-[family-name:var(--font-mono)] text-sm text-text-muted">
              No players registered yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerEditForm({
  player,
  onSubmit,
  onCancel,
}: {
  player: Player;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form action={onSubmit} className="panel p-5">
      <input type="hidden" name="id" value={player.id} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
            Display Name *
          </label>
          <input
            name="displayName"
            defaultValue={player.display_name}
            required
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
            Faction
          </label>
          <select
            name="faction"
            defaultValue={player.faction ?? ""}
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors cursor-pointer"
          >
            <option value="">None</option>
            {FACTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
            Sectorial
          </label>
          <input
            name="sectorial"
            defaultValue={player.sectorial ?? ""}
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors"
            placeholder="e.g. Military Orders"
          />
        </div>
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
            Role
          </label>
          <select
            name="role"
            defaultValue={player.role}
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors cursor-pointer"
          >
            <option value="player">Player</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-cyan/15 border-2 border-cyan-dim text-cyan hover:bg-cyan/25 hover:border-cyan font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
        >
          Save Changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-border text-text-secondary hover:text-text-primary font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
