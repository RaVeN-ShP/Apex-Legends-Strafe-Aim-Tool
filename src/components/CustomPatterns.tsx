"use client";

import { useEffect, useMemo, useState } from "react";
import { Gun, StrafePattern } from "@/types/gun";
import { useI18n } from "@/i18n/I18nProvider";

type CustomProfile = {
  id: string;
  name: string;
  strafePattern: StrafePattern[];
};

interface CustomPatternsProps {
  onSelect: (gun: Gun) => void;
}

const STORAGE_KEY = "customPatterns";

function loadProfiles(): CustomProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p.id === "string" && typeof p.name === "string" && Array.isArray(p.strafePattern));
  } catch {
    return [];
  }
}

function saveProfiles(profiles: CustomProfile[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {}
}

function createEmptyStep(): StrafePattern {
  return { direction: "left", duration: 200 };
}

function makeGunFromProfile(profile: CustomProfile): Gun {
  return {
    id: `custom:${profile.id}`,
    name: profile.name || "Custom",
    category: "custom",
    image: "/favicon.ico",
    strafePattern: profile.strafePattern,
  };
}

export default function CustomPatterns({ onSelect }: CustomPatternsProps) {
  const { t } = useI18n();
  const [profiles, setProfiles] = useState<CustomProfile[]>([]);
  const [editing, setEditing] = useState<CustomProfile | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftSteps, setDraftSteps] = useState<StrafePattern[]>([]);

  useEffect(() => {
    setProfiles(loadProfiles());
  }, []);

  useEffect(() => {
    saveProfiles(profiles);
  }, [profiles]);

  const isValid = useMemo(() => {
    if (!draftName.trim()) return false;
    if (!draftSteps.length) return false;
    for (const s of draftSteps) {
      if (s.duration <= 0 || !Number.isFinite(s.duration)) return false;
    }
    return true;
  }, [draftName, draftSteps]);

  const startNew = () => {
    setEditing({ id: generateId(), name: "", strafePattern: [createEmptyStep()] });
    setDraftName("");
    setDraftSteps([createEmptyStep()]);
  };

  const startEdit = (p: CustomProfile) => {
    setEditing(p);
    setDraftName(p.name);
    setDraftSteps(p.strafePattern.map((s) => ({ ...s })));
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraftName("");
    setDraftSteps([]);
  };

  const saveDraft = () => {
    if (!editing) return;
    const updated: CustomProfile = { id: editing.id, name: draftName.trim(), strafePattern: draftSteps.map((s) => ({ ...s, duration: Math.round(s.duration) })) };
    setProfiles((prev) => {
      const idx = prev.findIndex((p) => p.id === editing.id);
      if (idx === -1) return [...prev, updated];
      const copy = prev.slice();
      copy[idx] = updated;
      return copy;
    });
    cancelEdit();
  };

  const removeProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (editing?.id === id) cancelEdit();
  };

  const addStep = () => {
    setDraftSteps((prev) => [...prev, createEmptyStep()]);
  };

  const removeStep = (idx: number) => {
    setDraftSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, step: Partial<StrafePattern>) => {
    setDraftSteps((prev) => prev.map((s, i) => (i === idx ? { direction: step.direction ?? s.direction, duration: step.duration ?? s.duration } : s)));
  };

  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-white">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold tracking-wide">{t("custom.title")}</h3>
        <button
          type="button"
          onClick={startNew}
          className="text-xs px-2 py-1 rounded border border-white/15 bg-white/5 hover:bg-white/10"
        >
          {t("custom.new")}
        </button>
      </div>

      {/* List of profiles */}
      {profiles.length === 0 ? (
        <div className="text-xs text-white/60">{t("custom.empty")}</div>
      ) : (
        <div className="space-y-2">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded border border-white/10 bg-white/5">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{p.name}</div>
                <div className="text-[10px] text-white/60">{p.strafePattern.length} {t("custom.steps")}</div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelect(makeGunFromProfile(p))}
                  className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700"
                >
                  {t("custom.use")}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="text-xs px-2 py-1 rounded border border-white/15 hover:bg-white/10"
                >
                  {t("custom.edit")}
                </button>
                <button
                  type="button"
                  onClick={() => removeProfile(p.id)}
                  className="text-xs px-2 py-1 rounded border border-white/15 hover:bg-white/10 text-white/80"
                >
                  {t("custom.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div className="mt-3 p-3 rounded-md border border-white/10 bg-black/30">
          <div className="mb-2">
            <label className="block text-[11px] text-white/60 mb-1">{t("custom.name")}</label>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="w-full px-2 py-1 text-sm rounded bg-white/5 border border-white/10 outline-none focus:border-white/30"
              placeholder={t("custom.name")}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] text-white/60">{t("custom.steps")}</div>
              <button
                type="button"
                onClick={addStep}
                className="text-xs px-2 py-1 rounded border border-white/15 hover:bg-white/10"
              >
                {t("custom.addStep")}
              </button>
            </div>
            <div className="space-y-2">
              {draftSteps.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={s.direction}
                    onChange={(e) => updateStep(idx, { direction: e.target.value as StrafePattern["direction"] })}
                    className="text-xs px-2 py-1 rounded border border-white/15 bg-white/5"
                  >
                    <option value="left">{t("custom.left")}</option>
                    <option value="right">{t("custom.right")}</option>
                  </select>
                  <div className="text-[11px] text-white/60">{t("custom.durationMs")}</div>
                  <input
                    type="number"
                    min={1}
                    value={s.duration}
                    onChange={(e) => updateStep(idx, { duration: Number(e.target.value) })}
                    className="w-24 px-2 py-1 text-xs rounded bg-white/5 border border-white/10 outline-none focus:border-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className="ml-auto text-xs px-2 py-1 rounded border border-white/15 hover:bg-white/10"
                  >
                    {t("custom.delete")}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              disabled={!isValid}
              onClick={saveDraft}
              className={`text-xs px-3 py-1.5 rounded ${isValid ? "bg-red-600 hover:bg-red-700" : "bg-white/10 text-white/40 cursor-not-allowed"}`}
            >
              {t("custom.save")}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs px-3 py-1.5 rounded border border-white/15 hover:bg-white/10"
            >
              {t("custom.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function generateId(): string {
  // Compact unique id (not cryptographically secure)
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now().toString(36)}-${rand}`;
}


