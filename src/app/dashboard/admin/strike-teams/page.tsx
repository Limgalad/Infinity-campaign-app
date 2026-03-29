"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { createStrikeTeam, updateStrikeTeam, deleteStrikeTeam } from "../actions";
import { useToast } from "@/components/toast";
import type { Player, Campaign, StrikeTeam } from "@/lib/types/database";

type StrikeTeamWithPlayers = StrikeTeam & {
  player1: Player | null;
  player2: Player | null;
};

export default function AdminStrikeTeamsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [teams, setTeams] = useState<StrikeTeamWithPlayers[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  async function loadInitial() {
    const supabase = createClient();
    const [{ data: camps }, { data: players }] = await Promise.all([
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("players").select("*").order("display_name"),
    ]);
    setCampaigns((camps as Campaign[]) ?? []);
    setAllPlayers((players as Player[]) ?? []);
    if (camps && camps.length > 0) {
      setSelectedCampaignId(camps[0].id);
    }
    setLoading(false);
  }

  async function loadTeams(campaignId: string) {
    if (!campaignId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("strike_teams")
      .select("*, player1:players!strike_teams_player1_id_fkey(*), player2:players!strike_teams_player2_id_fkey(*)")
      .eq("campaign_id", campaignId)
      .order("name");
    setTeams((data ?? []) as StrikeTeamWithPlayers[]);
  }

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedCampaignId) loadTeams(selectedCampaignId);
  }, [selectedCampaignId]);

  // Compute which players are already assigned to a team in this campaign
  const assignedPlayerIds = new Set(
    teams.flatMap((t) => [t.player1_id, t.player2_id])
  );
  const unassignedPlayers = allPlayers.filter((p) => !assignedPlayerIds.has(p.id));

  async function handleCreate(formData: FormData) {
    formData.set("campaignId", selectedCampaignId);
    const result = await createStrikeTeam(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Strike team created");
      setShowCreate(false);
      loadTeams(selectedCampaignId);
    }
  }

  async function handleUpdate(formData: FormData) {
    formData.set("campaignId", selectedCampaignId);
    const result = await updateStrikeTeam(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Strike team updated");
      setEditingId(null);
      loadTeams(selectedCampaignId);
    }
  }

  async function handleDelete(teamId: string) {
    const formData = new FormData();
    formData.set("id", teamId);
    formData.set("campaignId", selectedCampaignId);
    const result = await deleteStrikeTeam(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Strike team deleted");
      setDeleteConfirm(null);
      loadTeams(selectedCampaignId);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-2 h-2 bg-cyan rounded-full status-dot" />
        <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary ml-3">
          Loading...
        </span>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="font-[family-name:var(--font-mono)] text-sm text-text-muted">
          No campaigns found. Create a campaign first.
        </p>
      </div>
    );
  }

  return (
    <div style={{ animation: "slide-up 0.5s ease-out" }}>
      {/* Campaign selector + actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <label className="data-label font-[family-name:var(--font-mono)]">CAMPAIGN</label>
          <select
            value={selectedCampaignId}
            onChange={(e) => {
              setSelectedCampaignId(e.target.value);
              setShowCreate(false);
              setEditingId(null);
            }}
            className="px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors cursor-pointer"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
            {teams.length} team{teams.length !== 1 ? "s" : ""} ·{" "}
            {unassignedPlayers.length} unassigned player{unassignedPlayers.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => {
              setShowCreate(!showCreate);
              setEditingId(null);
            }}
            disabled={unassignedPlayers.length < 2 && !showCreate}
            className="px-4 py-2 bg-cyan/15 border-2 border-cyan-dim text-cyan hover:bg-cyan/25 hover:border-cyan font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {showCreate ? "Cancel" : "Create Team"}
          </button>
        </div>
      </div>

      {/* Unassigned players notice */}
      {unassignedPlayers.length > 0 && (
        <div className="mb-6 px-4 py-3 bg-amber/5 border border-amber-dim/20">
          <span className="font-[family-name:var(--font-mono)] text-xs text-amber uppercase tracking-wider">
            Unassigned Players:{" "}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
            {unassignedPlayers.map((p) => p.display_name).join(", ")}
          </span>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <StrikeTeamForm
          players={allPlayers}
          assignedPlayerIds={assignedPlayerIds}
          onSubmit={handleCreate}
          submitLabel="Create Team"
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Team list */}
      <div className="space-y-3">
        {teams.map((team) => (
          <div key={team.id}>
            {editingId === team.id ? (
              <StrikeTeamForm
                team={team}
                players={allPlayers}
                assignedPlayerIds={assignedPlayerIds}
                currentTeamPlayerIds={[team.player1_id, team.player2_id]}
                onSubmit={handleUpdate}
                submitLabel="Save Changes"
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="panel p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="font-[family-name:var(--font-orbitron)] text-sm tracking-wider text-text-primary mb-3">
                    {team.name.toUpperCase()}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[team.player1, team.player2].map((player, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-surface-bright border border-border flex items-center justify-center shrink-0">
                          <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                            {player?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                          </span>
                        </div>
                        <div>
                          <div className="font-[family-name:var(--font-mono)] text-sm text-text-primary">
                            {player?.display_name ?? "Unknown"}
                          </div>
                          <div className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                            {player?.faction ?? "No faction"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingId(team.id);
                      setShowCreate(false);
                    }}
                    className="px-3 py-1.5 border border-border text-text-secondary hover:text-amber hover:border-amber-dim font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                  >
                    Edit
                  </button>

                  {deleteConfirm === team.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(team.id)}
                        className="px-3 py-1.5 bg-red/15 border border-red-dim text-red hover:bg-red/25 font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 border border-border text-text-secondary font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setDeleteConfirm(team.id);
                      }}
                      className="px-3 py-1.5 border border-border text-text-secondary hover:text-red hover:border-red-dim font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {teams.length === 0 && (
          <div className="panel p-8 text-center">
            <p className="font-[family-name:var(--font-mono)] text-sm text-text-muted">
              No strike teams in this campaign yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StrikeTeamForm({
  team,
  players,
  assignedPlayerIds,
  currentTeamPlayerIds = [],
  onSubmit,
  submitLabel,
  onCancel,
}: {
  team?: StrikeTeamWithPlayers;
  players: Player[];
  assignedPlayerIds: Set<string>;
  currentTeamPlayerIds?: string[];
  onSubmit: (formData: FormData) => void;
  submitLabel: string;
  onCancel: () => void;
}) {
  const [player1Id, setPlayer1Id] = useState(team?.player1_id ?? "");
  const [player2Id, setPlayer2Id] = useState(team?.player2_id ?? "");

  // Available players: unassigned + current team's players (when editing)
  const availablePlayers = players.filter(
    (p) => !assignedPlayerIds.has(p.id) || currentTeamPlayerIds.includes(p.id)
  );

  return (
    <form action={onSubmit} className="panel p-5 mb-4">
      {team && <input type="hidden" name="id" value={team.id} />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
            Team Name *
          </label>
          <input
            name="name"
            defaultValue={team?.name ?? ""}
            required
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors"
            placeholder="e.g. Crimson Vipers"
          />
        </div>
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
            Player 1 *
          </label>
          <select
            name="player1Id"
            value={player1Id}
            onChange={(e) => setPlayer1Id(e.target.value)}
            required
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors cursor-pointer"
          >
            <option value="">Select player...</option>
            {availablePlayers
              .filter((p) => p.id !== player2Id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name} {p.faction ? `(${p.faction})` : ""}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
            Player 2 *
          </label>
          <select
            name="player2Id"
            value={player2Id}
            onChange={(e) => setPlayer2Id(e.target.value)}
            required
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors cursor-pointer"
          >
            <option value="">Select player...</option>
            {availablePlayers
              .filter((p) => p.id !== player1Id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name} {p.faction ? `(${p.faction})` : ""}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-cyan/15 border-2 border-cyan-dim text-cyan hover:bg-cyan/25 hover:border-cyan font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
        >
          {submitLabel}
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
