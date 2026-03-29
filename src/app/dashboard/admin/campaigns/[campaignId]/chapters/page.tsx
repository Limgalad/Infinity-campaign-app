"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  createChapter,
  updateChapter,
  setChapterStatus,
  deleteChapter,
  resetEntireChapter,
} from "../../../actions";
import { useToast } from "@/components/toast";
import type { Campaign, Chapter } from "@/lib/types/database";

export default function AdminChaptersPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resetChapterConfirm, setResetChapterConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  async function loadData() {
    const supabase = createClient();
    const [{ data: camp }, { data: chaps }] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", campaignId).single(),
      supabase
        .from("chapters")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("chapter_number"),
    ]);
    setCampaign(camp as Campaign | null);
    setChapters((chaps as Chapter[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [campaignId]);

  async function handleCreate(formData: FormData) {
    formData.set("campaignId", campaignId);
    const result = await createChapter(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Chapter created");
      setShowCreate(false);
      loadData();
    }
  }

  async function handleUpdate(formData: FormData) {
    formData.set("campaignId", campaignId);
    const result = await updateChapter(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Chapter updated");
      setEditingId(null);
      loadData();
    }
  }

  async function handleStatusChange(chapterId: string, status: string) {
    const formData = new FormData();
    formData.set("id", chapterId);
    formData.set("campaignId", campaignId);
    formData.set("status", status);
    const result = await setChapterStatus(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast(`Chapter marked as ${status}`);
      loadData();
    }
  }

  async function handleDelete(chapterId: string) {
    const formData = new FormData();
    formData.set("id", chapterId);
    formData.set("campaignId", campaignId);
    const result = await deleteChapter(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Chapter deleted");
      setDeleteConfirm(null);
      loadData();
    }
  }

  async function handleResetChapter(chapterId: string) {
    const formData = new FormData();
    formData.set("chapterId", chapterId);
    formData.set("campaignId", campaignId);
    const result = await resetEntireChapter(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Chapter data reset (all results, XP, consumables, matches cleared)");
      setResetChapterConfirm(null);
      loadData();
    }
  }

  const nextChapterNumber = chapters.length > 0
    ? Math.max(...chapters.map((c) => c.chapter_number)) + 1
    : 1;

  function getStatusLabel(ch: Chapter) {
    if (ch.is_completed) return "completed";
    if (ch.is_active) return "active";
    return "upcoming";
  }

  const statusStyles = {
    completed: { bg: "bg-cyan/10", border: "border-cyan-dim/30", text: "text-cyan", dot: "bg-cyan" },
    active: { bg: "bg-green/10", border: "border-green-dim/30", text: "text-green", dot: "bg-green" },
    upcoming: { bg: "bg-amber/10", border: "border-amber-dim/30", text: "text-amber", dot: "bg-amber" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-2 h-2 bg-cyan rounded-full status-dot" />
        <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary ml-3">
          Loading chapters...
        </span>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="panel p-8 text-center">
        <p className="font-[family-name:var(--font-mono)] text-sm text-red">Campaign not found.</p>
      </div>
    );
  }

  return (
    <div style={{ animation: "slide-up 0.5s ease-out" }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/dashboard/admin/campaigns"
          className="font-[family-name:var(--font-mono)] text-xs text-text-secondary hover:text-cyan transition-colors"
        >
          Campaigns
        </Link>
        <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted">/</span>
        <span className="font-[family-name:var(--font-mono)] text-xs text-text-primary">
          {campaign.name}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted">/</span>
        <span className="font-[family-name:var(--font-mono)] text-xs text-cyan">Chapters</span>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between mb-6">
        <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary">
          {chapters.length} / {campaign.total_chapters} chapters
        </span>
        {chapters.length < campaign.total_chapters && (
          <button
            onClick={() => {
              setShowCreate(!showCreate);
              setEditingId(null);
            }}
            className="px-4 py-2 bg-cyan/15 border-2 border-cyan-dim text-cyan hover:bg-cyan/25 hover:border-cyan font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
          >
            {showCreate ? "Cancel" : "Add Chapter"}
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <ChapterForm
          chapterNumber={nextChapterNumber}
          onSubmit={handleCreate}
          submitLabel="Create Chapter"
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Chapter list */}
      <div className="space-y-3">
        {chapters.map((chapter) => {
          const status = getStatusLabel(chapter);
          const style = statusStyles[status];

          return (
            <div key={chapter.id}>
              {editingId === chapter.id ? (
                <ChapterForm
                  chapter={chapter}
                  chapterNumber={chapter.chapter_number}
                  onSubmit={handleUpdate}
                  submitLabel="Save Changes"
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className={`panel p-4 sm:p-5 border-l-4 ${style.border}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-[family-name:var(--font-orbitron)] text-sm text-text-primary">
                          CH.{chapter.chapter_number}
                        </span>
                        <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary">
                          {chapter.name}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${style.bg} border ${style.border} ${style.text} font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${status === "active" ? "status-dot" : ""}`} />
                          {status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {chapter.mission_name && (
                          <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                            Mission: {chapter.mission_name}
                          </span>
                        )}
                        {chapter.start_date && (
                          <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted">
                            {new Date(chapter.start_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status controls */}
                      {status === "upcoming" && (
                        <button
                          onClick={() => handleStatusChange(chapter.id, "active")}
                          className="px-3 py-1.5 border border-green-dim/40 text-green hover:bg-green/10 font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                        >
                          Activate
                        </button>
                      )}
                      {status === "active" && (
                        <button
                          onClick={() => handleStatusChange(chapter.id, "completed")}
                          className="px-3 py-1.5 border border-cyan-dim/40 text-cyan hover:bg-cyan/10 font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                        >
                          Complete
                        </button>
                      )}
                      {status === "completed" && (
                        <button
                          onClick={() => handleStatusChange(chapter.id, "upcoming")}
                          className="px-3 py-1.5 border border-amber-dim/40 text-amber hover:bg-amber/10 font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                        >
                          Reopen
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditingId(chapter.id);
                          setShowCreate(false);
                        }}
                        className="px-3 py-1.5 border border-border text-text-secondary hover:text-amber hover:border-amber-dim font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                      >
                        Edit
                      </button>

                      {resetChapterConfirm === chapter.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResetChapter(chapter.id)}
                            className="px-3 py-1.5 bg-red/15 border border-red-dim text-red hover:bg-red/25 font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                          >
                            Confirm Reset
                          </button>
                          <button
                            onClick={() => setResetChapterConfirm(null)}
                            className="px-3 py-1.5 border border-border text-text-secondary font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setResetChapterConfirm(chapter.id);
                            setDeleteConfirm(null);
                          }}
                          className="px-3 py-1.5 border border-red-dim/30 text-text-secondary hover:text-red hover:border-red-dim font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                        >
                          Reset Data
                        </button>
                      )}

                      {deleteConfirm === chapter.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(chapter.id)}
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
                            setDeleteConfirm(chapter.id);
                          }}
                          className="px-3 py-1.5 border border-border text-text-secondary hover:text-red hover:border-red-dim font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {chapters.length === 0 && (
          <div className="panel p-8 text-center">
            <p className="font-[family-name:var(--font-mono)] text-sm text-text-muted">
              No chapters yet. Add the first chapter above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChapterForm({
  chapter,
  chapterNumber,
  onSubmit,
  submitLabel,
  onCancel,
}: {
  chapter?: Chapter;
  chapterNumber: number;
  onSubmit: (formData: FormData) => void;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <form action={onSubmit} className="panel p-5 mb-4">
      {chapter && <input type="hidden" name="id" value={chapter.id} />}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
            Chapter #
          </label>
          <input
            name="chapterNumber"
            type="number"
            min={1}
            defaultValue={chapter?.chapter_number ?? chapterNumber}
            readOnly={!!chapter}
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors read-only:opacity-50"
          />
        </div>
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
            Chapter Name *
          </label>
          <input
            name="name"
            defaultValue={chapter?.name ?? ""}
            required
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors"
            placeholder="e.g. Aggressive Recon"
          />
        </div>
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
            Mission Name
          </label>
          <input
            name="missionName"
            defaultValue={chapter?.mission_name ?? ""}
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
            Start Date
          </label>
          <input
            name="startDate"
            type="date"
            defaultValue={chapter?.start_date ?? ""}
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors"
          />
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
