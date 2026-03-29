"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createCampaign, updateCampaign, deleteCampaign } from "../actions";
import { useToast } from "@/components/toast";
import type { Campaign } from "@/lib/types/database";

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  async function loadCampaigns() {
    const supabase = createClient();
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    setCampaigns((data as Campaign[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function handleCreate(formData: FormData) {
    const result = await createCampaign(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Campaign created successfully");
      setShowCreate(false);
      loadCampaigns();
    }
  }

  async function handleUpdate(formData: FormData) {
    const result = await updateCampaign(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Campaign updated successfully");
      setEditingId(null);
      loadCampaigns();
    }
  }

  async function handleDelete(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    const result = await deleteCampaign(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Campaign deleted");
      setDeleteConfirm(null);
      loadCampaigns();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-2 h-2 bg-cyan rounded-full status-dot" />
        <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary ml-3">
          Loading campaigns...
        </span>
      </div>
    );
  }

  return (
    <div style={{ animation: "slide-up 0.5s ease-out" }}>
      {/* Actions bar */}
      <div className="flex items-center justify-between mb-6">
        <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary">
          {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => {
            setShowCreate(!showCreate);
            setEditingId(null);
          }}
          className="px-4 py-2 bg-cyan/15 border-2 border-cyan-dim text-cyan hover:bg-cyan/25 hover:border-cyan font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
        >
          {showCreate ? "Cancel" : "Create Campaign"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <CampaignForm
          onSubmit={handleCreate}
          submitLabel="Create Campaign"
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Campaign list */}
      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <div key={campaign.id}>
            {editingId === campaign.id ? (
              <CampaignForm
                campaign={campaign}
                onSubmit={handleUpdate}
                submitLabel="Save Changes"
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="panel p-5 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-[family-name:var(--font-orbitron)] text-sm tracking-wider text-text-primary">
                      {campaign.name.toUpperCase()}
                    </h3>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted">
                      {campaign.total_chapters} chapters
                    </span>
                  </div>
                  {campaign.description && (
                    <p className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                      {campaign.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/dashboard/admin/campaigns/${campaign.id}/chapters`}
                    className="px-3 py-1.5 border border-cyan-dim/40 text-cyan hover:bg-cyan/10 font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all"
                  >
                    Chapters
                  </Link>
                  <button
                    onClick={() => {
                      setEditingId(campaign.id);
                      setShowCreate(false);
                    }}
                    className="px-3 py-1.5 border border-border text-text-secondary hover:text-amber hover:border-amber-dim font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                  >
                    Edit
                  </button>

                  {deleteConfirm === campaign.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        className="px-3 py-1.5 bg-red/15 border border-red-dim text-red hover:bg-red/25 font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 border border-border text-text-secondary hover:text-text-primary font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setDeleteConfirm(campaign.id);
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

        {campaigns.length === 0 && (
          <div className="panel p-8 text-center">
            <p className="font-[family-name:var(--font-mono)] text-sm text-text-muted">
              No campaigns yet. Create your first campaign above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignForm({
  campaign,
  onSubmit,
  submitLabel,
  onCancel,
}: {
  campaign?: Campaign;
  onSubmit: (formData: FormData) => void;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <form
      action={onSubmit}
      className="panel p-5 mb-6"
    >
      {campaign && <input type="hidden" name="id" value={campaign.id} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
            Campaign Name *
          </label>
          <input
            name="name"
            defaultValue={campaign?.name ?? ""}
            required
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors"
            placeholder="e.g. Infinity Red Lands"
          />
        </div>
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
            Total Chapters
          </label>
          <input
            name="totalChapters"
            type="number"
            min={1}
            max={20}
            defaultValue={campaign?.total_chapters ?? 6}
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
          Description
        </label>
        <textarea
          name="description"
          defaultValue={campaign?.description ?? ""}
          rows={2}
          className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors resize-none"
          placeholder="Brief campaign description..."
        />
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
