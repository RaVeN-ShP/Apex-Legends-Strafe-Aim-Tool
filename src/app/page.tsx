"use client";

import { useEffect, useMemo, useState } from "react";
import { Gun, Pattern } from "@/types/gun";
import { DELAY_SLIDER_MAX_SECONDS, DEFAULT_DELAY_SECONDS } from "@/config/constants";
import { guns } from "@/data/guns";
import GunSelector from "@/components/GunSelector";
import StrafeTimer from "@/components/StrafeTimer";
import PatternVisualizer from "@/components/PatternVisualizer";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Listbox, Transition, Disclosure } from "@headlessui/react";
import { Fragment } from "react";
import Image from "next/image";
import { ChevronDownIcon, ArrowsRightLeftIcon, ArrowLeftIcon, ArrowRightIcon, BoltIcon, TrashIcon, ClockIcon } from "@heroicons/react/24/outline";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

type CustomProfile = {
  id: string;
  name: string;
  strafePattern: Pattern[];
};

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

function makeGunFromProfile(profile: CustomProfile): Gun {
  return {
    id: `custom:${profile.id}`,
    name: profile.name,
    category: 'custom',
    image: '/favicon.ico',
    pattern: { default: profile.strafePattern },
  };
}

function generateId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now().toString(36)}-${rand}`;
}

export default function Home() {
  const [selectedGun, setSelectedGun] = useState<Gun | null>(guns[0] ?? null);
  const [selectedModeId, setSelectedModeId] = useState<string | null>(null);
  const [waitTimeSeconds, setWaitTimeSeconds] = useState(DEFAULT_DELAY_SECONDS);
  const [volume, setVolume] = useState(0.8);
  const { t } = useI18n();
  const [profiles, setProfiles] = useState<CustomProfile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftSteps, setDraftSteps] = useState<Pattern[]>([{ type: 'direction', direction: 'left', duration: 200 }]);
  const [editResetToken, setEditResetToken] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importGunId, setImportGunId] = useState<string | null>(null);
  const [importVariantKey, setImportVariantKey] = useState<string | null>(null);

  useEffect(() => {
    setProfiles(loadProfiles());
  }, []);

  // expose volume only
  useEffect(() => {
    (window as any).__setVolume = (v: number) => setVolume(v);
    return () => {
      try { delete (window as any).__setVolume; } catch {}
    };
  }, []);

  useEffect(() => {
    saveProfiles(profiles);
  }, [profiles]);

  const allGuns: Gun[] = useMemo(() => {
    return [
      ...profiles.map(makeGunFromProfile),
      ...guns,
    ];
  }, [profiles]);

  // Reset/initialize mode when switching guns
  useEffect(() => {
    if (!selectedGun) {
      setSelectedModeId(null);
      return;
    }
    const keys = Object.keys(selectedGun.pattern ?? {});
    if (keys.length > 1) {
      setSelectedModeId((prev) => {
        if (prev && keys.includes(prev)) return prev;
        // prefer 'default' if present, else first key
        return keys.includes('default') ? 'default' : keys[0];
      });
    } else {
      setSelectedModeId(null);
    }
    // Initialize slider default to current gun reload time (clamped to slider bounds)
    const reload = Math.max(0, Math.min(DELAY_SLIDER_MAX_SECONDS, selectedGun.reloadTimeSeconds ?? 0));
    setWaitTimeSeconds(DEFAULT_DELAY_SECONDS);
  }, [selectedGun]);

  // Effective selections
  const selectedPatternKey: string | null = useMemo(() => {
    if (!selectedGun) return null;
    const keys = Object.keys(selectedGun.pattern ?? {});
    if (keys.length <= 1) return keys[0] ?? 'default';
    if (selectedModeId && keys.includes(selectedModeId)) return selectedModeId;
    return keys.includes('default') ? 'default' : keys[0];
  }, [selectedGun, selectedModeId]);

  const selectedPattern: Pattern[] = useMemo(() => {
    if (!selectedGun) return [];
    const all = selectedGun.pattern ?? {};
    const key = selectedPatternKey ?? (Object.keys(all)[0] ?? 'default');
    return all[key] ?? [];
  }, [selectedGun, selectedPatternKey]);

  const startCreate = () => {
    setIsCreating(true);
    setDraftName("");
    setDraftSteps([{ type: 'direction', direction: 'left', duration: 200 }]);
    setEditingId(null);
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setDraftName("");
    setDraftSteps([{ type: 'direction', direction: 'left', duration: 200 }]);
    setEditingId(null);
  };

  const addStep = () => {
    setDraftSteps((prev) => [...prev, { type: 'direction', direction: 'left', duration: 200 }]);
    setEditResetToken((v) => v + 1);
  };

  const removeStep = (idx: number) => {
    setDraftSteps((prev) => prev.filter((_, i) => i !== idx));
    setEditResetToken((v) => v + 1);
  };

  const updateStep = (idx: number, step: Partial<Pattern>) => {
    setDraftSteps((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      const base: any = { ...s };
      if (step.type) base.type = step.type;
      if ('direction' in step && (step as any).direction !== undefined) base.direction = (step as any).direction;
      if ('duration' in step && step.duration !== undefined) base.duration = step.duration as number;
      return base as Pattern;
    }));
    setEditResetToken((v) => v + 1);
  };

  const isDraftValid = draftName.trim().length > 0 && draftSteps.length > 0 && draftSteps.every((s) => Number.isFinite(s.duration) && s.duration > 0);

  const saveDraft = () => {
    if (!isDraftValid) return;
    if (editingId) {
      const updated: CustomProfile = { id: editingId, name: draftName.trim(), strafePattern: draftSteps.map((s) => ({ ...s, duration: Math.round(s.duration) })) };
      setProfiles((prev) => {
        const idx = prev.findIndex((p) => p.id === editingId);
        if (idx === -1) return [updated, ...prev];
        const copy = prev.slice();
        copy[idx] = updated;
        return copy;
      });
      setSelectedGun(makeGunFromProfile(updated));
      setIsCreating(false);
      setEditingId(null);
    } else {
      const id = generateId();
      const profile: CustomProfile = { id, name: draftName.trim(), strafePattern: draftSteps.map((s) => ({ ...s, duration: Math.round(s.duration) })) };
      setProfiles((prev) => [profile, ...prev]);
      const gun = makeGunFromProfile(profile);
      setSelectedGun(gun);
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 py-6 px-4 text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">{t('app.title')}</h1>
              <p className="text-white/80 mt-2 text-sm md:text-base">
            {t('app.subtitle.before')}
            <a href="https://x.com/ahn99fps" target="_blank" rel="noreferrer" className="underline hover:text-white">
              ahn99
            </a>
            {t('app.subtitle.after')}
              </p>
            </div>
            <div className="shrink-0">
              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
          <p className="text-white/60 mt-2 text-xs md:text-sm">
            References: {" "}
            <a href="https://docs.google.com/document/d/1olISc98UQ2ucUlvm3pGEt5sqG7Qf4LC7I2HnmTOB7w4/edit?tab=t.0" target="_blank" rel="noreferrer" className="underline hover:text-white/80">
              {t('refs.doc')}
            </a>{" "}•{" "}
            <a href="https://www.youtube.com/watch?v=fPLSisfQGlE" target="_blank" rel="noreferrer" className="underline hover:text-white/80">
              {t('refs.video')}
            </a>
          </p>
        </header>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
          {/* Left Sidebar */}
          <aside className="order-2 md:order-1">
            <div className="mb-2">
              <button
                type="button"
                onClick={startCreate}
                className="w-full text-sm font-semibold px-3 py-2 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white"
              >
                {t('custom.createTop', { defaultValue: 'Create Custom' })}
              </button>
            </div>
            <GunSelector
              guns={allGuns}
              selectedGun={selectedGun}
              onGunSelect={(g) => { setSelectedGun(g); setIsCreating(false); }}
              onDeleteCustom={(g) => {
                if (g.category !== 'custom') return;
                const ok = window.confirm(t('custom.confirmDelete', { defaultValue: 'Delete this custom pattern?' }));
                if (!ok) return;
                const id = g.id.startsWith('custom:') ? g.id.slice('custom:'.length) : g.id;
                setProfiles((prev) => prev.filter((p) => p.id !== id));
                if (selectedGun?.id === g.id) {
                  // Fallback to first available gun
                  const next = allGuns.find((x) => x.id !== g.id) || guns[0] || null;
                  setSelectedGun(next);
                }
              }}
              onEditCustom={(g) => {
                if (g.category !== 'custom') return;
                const id = g.id.startsWith('custom:') ? g.id.slice('custom:'.length) : g.id;
                const p = profiles.find((x) => x.id === id);
                if (!p) return;
                setIsCreating(true);
                setDraftName(p.name);
                // For custom profiles we still work with a linear pattern editor
                setDraftSteps(p.strafePattern.map((s) => ({ ...s })));
                setEditResetToken((v) => v + 1);
                setEditingId(id);
                // When saving, this will create a new profile currently; optionally replace existing
                // If you want replace behavior, we can add an editId state and update instead of add
              }}
              onCopyCustomize={(g) => {
                // Determine source variant from current selection if available, else default
                const keys = Object.keys(g.pattern ?? {});
                const variantKey = (selectedGun?.id === g.id && selectedPatternKey && keys.includes(selectedPatternKey))
                  ? selectedPatternKey
                  : (keys.includes('default') ? 'default' : keys[0]);
                const steps = (g.pattern?.[variantKey] ?? []).map((s) => ({ ...s }));
                setIsCreating(true);
                setDraftName(`${g.name} - Copy`);
                setDraftSteps(steps);
                setEditResetToken((v) => v + 1);
                setEditingId(null);
              }}
              listMode
            />
            {/* Global settings moved into main StrafeTimer UI */}
          </aside>

        {/* Main Section */}
          <section className="relative rounded-xl border border-white/10 bg-black/20 p-4 md:p-6 text-white order-1 md:order-2">
            {isCreating ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xl font-bold tracking-wide">{t('custom.createTitle', { defaultValue: 'Create Custom Pattern' })}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelCreate}
                      className="text-sm px-3 py-1.5 rounded-md border border-white/15 bg-white/5 hover:bg-white/10"
                      title={t('custom.cancel')}
                    >
                      {t('custom.cancel')}
                    </button>
                    <button
                      type="button"
                      disabled={!isDraftValid}
                      onClick={saveDraft}
                      className={`text-sm px-3 py-1.5 rounded-md ${isDraftValid ? 'bg-red-600 hover:bg-red-700' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}
                      title={t('custom.save')}
                    >
                      {t('custom.save')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-3">
                    {/* Import from existing gun + variant */}
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="text-[11px] text-white/60 mb-2">Import from</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Listbox value={importGunId} onChange={(v: string | null) => { setImportGunId(v); setImportVariantKey(null); }}>
                          <div className="relative">
                            <Listbox.Button className="text-xs h-8 px-2 rounded border border-white/15 bg-black/20 min-w-[180px] text-left">
                              {(() => {
                                const gun = allGuns.find(x => x.id === importGunId);
                                return gun ? gun.name : 'Select gun';
                              })()}
                            </Listbox.Button>
                            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                              <Listbox.Options className="absolute z-20 mt-1 max-h-56 overflow-auto w-full rounded-md border border-white/15 bg-black/90 shadow-lg focus:outline-none">
                                {allGuns.map((g) => (
                                  <Listbox.Option key={g.id} value={g.id} className={({ active }) => `px-2 py-1.5 text-xs ${active ? 'bg-white/10' : ''}`}>
                                    {g.name}
                                  </Listbox.Option>
                                ))}
                              </Listbox.Options>
                            </Transition>
                          </div>
                        </Listbox>
                        <Listbox
                          value={importVariantKey}
                          onChange={(v: string | null) => setImportVariantKey(v)}
                          disabled={!importGunId}
                        >
                          <div className="relative">
                            <Listbox.Button className={`text-xs h-8 px-2 rounded border border-white/15 ${importGunId ? 'bg-black/20' : 'bg-black/20 opacity-50'} min-w-[140px] text-left`}>
                              {(() => {
                                if (!importGunId) return 'Variant';
                                const g = allGuns.find(x => x.id === importGunId);
                                const keys = g ? Object.keys(g.pattern ?? {}) : [];
                                const key = importVariantKey && keys.includes(importVariantKey) ? importVariantKey : (keys.includes('default') ? 'default' : keys[0]);
                                return key || 'Variant';
                              })()}
                            </Listbox.Button>
                            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                              <Listbox.Options className="absolute z-20 mt-1 max-h-48 overflow-auto w-full rounded-md border border-white/15 bg-black/90 shadow-lg focus:outline-none">
                                {(() => {
                                  const g = allGuns.find(x => x.id === importGunId);
                                  const keys = g ? Object.keys(g.pattern ?? {}) : [];
                                  return keys.map((k) => (
                                    <Listbox.Option key={k} value={k} className={({ active }) => `px-2 py-1.5 text-xs ${active ? 'bg-white/10' : ''}`}>
                                      {k}
                                    </Listbox.Option>
                                  ));
                                })()}
                              </Listbox.Options>
                            </Transition>
                          </div>
                        </Listbox>
                        <button
                          type="button"
                          onClick={() => {
                            const g = allGuns.find(x => x.id === importGunId);
                            if (!g) return;
                            const keys = Object.keys(g.pattern ?? {});
                            const key = (importVariantKey && keys.includes(importVariantKey)) ? importVariantKey : (keys.includes('default') ? 'default' : keys[0]);
                            const steps = (g.pattern?.[key] ?? []).map((s) => ({ ...s }));
                            setDraftSteps(steps);
                            setEditResetToken((v) => v + 1);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs h-8 px-2 rounded border border-white/15 bg-black/20 hover:bg-white/10"
                          title="Copy pattern"
                        >
                          <ArrowsRightLeftIcon className="w-4 h-4" />
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <label className="block text-[11px] text-white/60 mb-1">{t('custom.name')}</label>
                      <input
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className="w-full h-9 px-2 text-sm rounded bg-black/20 border border-white/10 outline-none focus:border-white/30"
                        placeholder={t('custom.name')}
                      />
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-white/90">{t('custom.steps')}</div>
                        <button
                          type="button"
                          onClick={addStep}
                          className="inline-flex items-center gap-1.5 text-xs h-8 px-2 rounded border border-white/15 bg-black/20 hover:bg-white/10"
                        >
                          <PlusIcon className="w-4 h-4" />
                          {t('custom.addStep')}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {draftSteps.map((s, idx) => (
                          <div key={idx} className="rounded-md border border-white/10 bg-black/20 px-2 py-2 flex flex-wrap items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/10 text-white/80 text-[11px] inline-flex items-center justify-center select-none">
                              {idx + 1}
                            </div>
                            <Listbox value={s.type} onChange={(v: Pattern['type']) => updateStep(idx, { type: v })}>
                              <div className="relative">
                                <Listbox.Button className="text-xs h-8 px-2 rounded border border-white/15 bg-black/30 min-w-[100px] text-left">
                                  {s.type === 'direction' ? 'Direction' : 'Shoot'}
                                </Listbox.Button>
                                <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                  <Listbox.Options className="absolute z-20 mt-1 w-full rounded-md border border-white/15 bg-black/90 shadow-lg focus:outline-none">
                                    <Listbox.Option value="direction" className={({ active }) => `px-2 py-1.5 text-xs ${active ? 'bg-white/10' : ''}`}>
                                      Direction
                                    </Listbox.Option>
                                    <Listbox.Option value="shoot" className={({ active }) => `px-2 py-1.5 text-xs ${active ? 'bg-white/10' : ''}`}>
                                      Shoot
                                    </Listbox.Option>
                                  </Listbox.Options>
                                </Transition>
                              </div>
                            </Listbox>
                            {s.type === 'direction' && (
                              <Listbox value={s.direction} onChange={(v: any) => updateStep(idx, { direction: v } as any)}>
                                <div className="relative">
                                  <Listbox.Button className="text-xs h-8 px-2 rounded border border-white/15 bg-black/30 min-w-[90px] text-left">
                                    {s.type === 'direction' ? (s.direction === 'left' ? t('custom.left') : t('custom.right')) : '-'}
                                  </Listbox.Button>
                                  <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                    <Listbox.Options className="absolute z-20 mt-1 w-full rounded-md border border-white/15 bg-black/90 shadow-lg focus:outline-none">
                                      <Listbox.Option value="left" className={({ active }) => `px-2 py-1.5 text-xs ${active ? 'bg-white/10' : ''}`}>
                                        {t('custom.left')}
                                      </Listbox.Option>
                                      <Listbox.Option value="right" className={({ active }) => `px-2 py-1.5 text-xs ${active ? 'bg-white/10' : ''}`}>
                                        {t('custom.right')}
                                      </Listbox.Option>
                                    </Listbox.Options>
                                  </Transition>
                                </div>
                              </Listbox>
                            )}
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                value={s.duration}
                                onChange={(e) => updateStep(idx, { duration: Number(e.target.value) } as any)}
                                className="w-24 h-8 px-2 text-xs rounded bg-black/30 border border-white/10 outline-none focus:border-white/30"
                              />
                              <div className="text-[11px] text-white/60 inline-flex items-center gap-1 whitespace-nowrap leading-none">
                                <ClockIcon className="w-3.5 h-3.5 -mt-px" /> {t('custom.durationMs')}
                              </div>
                            </div>
                            <div className="w-full sm:w-auto sm:ml-auto">
                              <button
                                type="button"
                                onClick={() => removeStep(idx)}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs h-8 px-2 rounded border border-white/15 bg-black/30 hover:bg-white/10"
                                title={t('custom.delete')}
                              >
                                <TrashIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">{t('custom.delete')}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <div className="text-sm font-semibold mb-2">{t('custom.preview', { defaultValue: 'Preview' })}</div>
                    <PatternVisualizer gun={{ id: 'draft', name: draftName || 'Draft', category: 'custom', image: '/favicon.ico', pattern: { default: draftSteps } }} pattern={draftSteps} />
                    <div className="mt-3 overflow-x-auto">
                      <StrafeTimer gun={{ id: 'draft', name: draftName || 'Draft', category: 'custom', image: '/favicon.ico', pattern: { default: draftSteps } }} pattern={draftSteps} volume={volume} resetToken={editResetToken} />
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedGun ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-12 md:w-16 md:h-16 shrink-0">
                      <Image src={selectedGun.image} alt={selectedGun.name} fill className="object-contain invert" sizes="48px" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xl font-bold tracking-wide truncate">{selectedGun.name}</div>
                      {selectedGun.remarks && selectedGun.remarks.length > 0 && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 pr-28 md:pr-0">
                          {selectedGun.remarks.map((r, i) => (
                            <span key={i} className="rounded-md border border-purple-400/30 bg-purple-500/10 text-purple-200 text-[11px] px-2 py-0.5">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Pattern key buttonset: responsive placement to avoid overlap on small screens */}
                {selectedGun.pattern && Object.keys(selectedGun.pattern).length > 1 && (
                  <div className="relative mt-2 flex flex-wrap items-center gap-2 z-10 md:absolute md:right-6 md:top-6 md:mt-0">
                    {Object.keys(selectedGun.pattern).map((key) => {
                      const label = key === 'default' ? 'Default' : key;
                      const active = key === selectedPatternKey;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedModeId(key)}
                          className={`text-xs px-2 py-1 rounded border capitalize ${active ? 'border-red-500 bg-red-600/20 text-red-200' : 'border-white/15 bg-white/5 text-white/90 hover:bg-white/10'}`}
                          title={label}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
                <PatternVisualizer gun={selectedGun} pattern={selectedPattern} />
                <div className="pt-2">
                  <StrafeTimer gun={selectedGun} pattern={selectedPattern} volume={volume} resetToken={selectedPatternKey ?? undefined} />
                </div>
                
                {/* FAQ Section inside main panel */}
                <div className="pt-4 border-t border-white/10">
                  <h2 className="text-lg font-bold mb-4">{t('faq.title')}</h2>
                  <div className="space-y-2">
                    {['q0','q1','q2','q3','q4','q5','q6','q7'].map((k) => (
                      <Disclosure key={k}>
                        {({ open }) => (
                          <div className="rounded-md border border-white/10 bg-white/5">
                            <Disclosure.Button className="w-full flex items-center justify-between px-3 py-2 text-left">
                              <span className="text-sm font-semibold text-white/90">{t(`faq.${k}.question`)}</span>
                              <ChevronDownIcon className={`w-4 h-4 text-white/70 transition-transform ${open ? 'rotate-180' : ''}`} />
                            </Disclosure.Button>
                            <Disclosure.Panel className="px-3 pb-3 text-xs text-white/70">
                              {k === 'q7' ? (
                                <div>
                                  <div>{t(`faq.${k}.answer`, { weapon: selectedGun?.name ?? '-' })}</div>
                                  <div className="mt-1 text-white/60">{t(`faq.${k}.formula`, { weapon: selectedGun?.name ?? '-' })}</div>
                                </div>
                              ) : t(`faq.${k}.answer`)}
                            </Disclosure.Panel>
                          </div>
                        )}
                      </Disclosure>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-white/70">{t('main.selectPrompt')}</div>
            )}
          </section>
        </div>


        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-white/50">
          {t('footer.credit', { name: 'RaVeN_ShP' })}
          <div className="mt-1">
            <span className="text-white/60">{t('footer.contributors')}</span>
            <span className="ml-1 inline-flex gap-2">
              <a href="https://www.youtube.com/@ahn99fps" target="_blank" rel="noreferrer" className="underline hover:text-white/80">ahn99</a>
              <span>•</span>
              <a href="https://www.youtube.com/@Mokeysniper" target="_blank" rel="noreferrer" className="underline hover:text-white/80">Mokeysniper</a>
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
