"use client";

import { useEffect, useMemo, useState } from "react";
import { Gun, StrafePattern } from "@/types/gun";
import { guns } from "@/data/guns";
import GunSelector from "@/components/GunSelector";
import StrafeTimer from "@/components/StrafeTimer";
// import GlobalSettings from "@/components/GlobalSettings";
import PatternVisualizer from "@/components/PatternVisualizer";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Listbox, Transition, Disclosure } from "@headlessui/react";
import { Fragment } from "react";
import Image from "next/image";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

type CustomProfile = {
  id: string;
  name: string;
  strafePattern: StrafePattern[];
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
    strafePattern: profile.strafePattern,
  };
}

function generateId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now().toString(36)}-${rand}`;
}

export default function Home() {
  const [selectedGun, setSelectedGun] = useState<Gun | null>(guns[0] ?? null);
  const [waitTimeSeconds, setWaitTimeSeconds] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const { t } = useI18n();
  const [profiles, setProfiles] = useState<CustomProfile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftSteps, setDraftSteps] = useState<StrafePattern[]>([{ direction: 'left', duration: 200 }]);
  const [editResetToken, setEditResetToken] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setProfiles(loadProfiles());
  }, []);

  // expose setters so StrafeTimer inline controls can update parent state
  useEffect(() => {
    (window as any).__setWaitTime = (v: number) => setWaitTimeSeconds(v);
    (window as any).__setVolume = (v: number) => setVolume(v);
    return () => {
      try { delete (window as any).__setWaitTime; } catch {}
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

  const startCreate = () => {
    setIsCreating(true);
    setDraftName("");
    setDraftSteps([{ direction: 'left', duration: 200 }]);
    setEditingId(null);
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setDraftName("");
    setDraftSteps([{ direction: 'left', duration: 200 }]);
    setEditingId(null);
  };

  const addStep = () => {
    setDraftSteps((prev) => [...prev, { direction: 'left', duration: 200 }]);
    setEditResetToken((v) => v + 1);
  };

  const removeStep = (idx: number) => {
    setDraftSteps((prev) => prev.filter((_, i) => i !== idx));
    setEditResetToken((v) => v + 1);
  };

  const updateStep = (idx: number, step: Partial<StrafePattern>) => {
    setDraftSteps((prev) => prev.map((s, i) => (i === idx ? { direction: step.direction ?? s.direction, duration: step.duration ?? s.duration } : s)));
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
    <main className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 py-6 px-4">
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
          <aside>
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
                setDraftSteps(p.strafePattern.map((s) => ({ ...s })));
                setEditResetToken((v) => v + 1);
                setEditingId(id);
                // When saving, this will create a new profile currently; optionally replace existing
                // If you want replace behavior, we can add an editId state and update instead of add
              }}
              listMode
            />
            {/* Global settings moved into main StrafeTimer UI */}
          </aside>

        {/* Main Section */}
          <section className="rounded-xl border border-white/10 bg-black/20 p-4 md:p-6 text-white">
            {isCreating ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xl font-bold tracking-wide">{t('custom.createTitle', { defaultValue: 'Create Custom Pattern' })}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelCreate}
                      className="text-sm px-3 py-1.5 rounded border border-white/15 hover:bg-white/10"
                    >
                      {t('custom.cancel')}
                    </button>
                    <button
                      type="button"
                      disabled={!isDraftValid}
                      onClick={saveDraft}
                      className={`text-sm px-3 py-1.5 rounded ${isDraftValid ? 'bg-red-600 hover:bg-red-700' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}
                    >
                      {t('custom.save')}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <div className="mb-2">
                      <label className="block text-[11px] text-white/60 mb-1">{t('custom.name')}</label>
                      <input
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className="w-full px-2 py-1 text-sm rounded bg-white/5 border border-white/10 outline-none focus:border-white/30"
                        placeholder={t('custom.name')}
                      />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] text-white/60">{t('custom.steps')}</div>
                      <button
                        type="button"
                        onClick={addStep}
                        className="text-xs px-2 py-1 rounded border border-white/15 hover:bg-white/10"
                      >
                        {t('custom.addStep')}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {draftSteps.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Listbox value={s.direction} onChange={(v: StrafePattern['direction']) => updateStep(idx, { direction: v })}>
                            <div className="relative">
                              <Listbox.Button className="text-xs px-2 py-1 rounded border border-white/15 bg-white/5 min-w-[80px] text-left">
                                {s.direction === 'left' ? t('custom.left') : t('custom.right')}
                              </Listbox.Button>
                              <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                <Listbox.Options className="absolute z-20 mt-1 w-full rounded-md border border-white/15 bg-black/90 shadow-lg focus:outline-none">
                                  <Listbox.Option value="left" className={({ active }) => `px-2 py-1 text-xs ${active ? 'bg-white/10' : ''}`}>
                                    {t('custom.left')}
                                  </Listbox.Option>
                                  <Listbox.Option value="right" className={({ active }) => `px-2 py-1 text-xs ${active ? 'bg-white/10' : ''}`}>
                                    {t('custom.right')}
                                  </Listbox.Option>
                                </Listbox.Options>
                              </Transition>
                            </div>
                          </Listbox>
                          <div className="text-[11px] text-white/60">{t('custom.durationMs')}</div>
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
                            {t('custom.delete')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <div className="text-sm font-semibold mb-2">{t('custom.preview', { defaultValue: 'Preview' })}</div>
                    <PatternVisualizer gun={{ id: 'draft', name: draftName || 'Draft', category: 'custom', image: '/favicon.ico', strafePattern: draftSteps }} />
                    <div className="mt-3">
                      <StrafeTimer gun={{ id: 'draft', name: draftName || 'Draft', category: 'custom', image: '/favicon.ico', strafePattern: draftSteps }} waitTimeSeconds={waitTimeSeconds} volume={volume} resetToken={editResetToken} />
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
                        <div className="mt-1 flex flex-wrap items-center gap-2">
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
                <PatternVisualizer gun={selectedGun} />
                <div className="pt-2">
                  <StrafeTimer gun={selectedGun} waitTimeSeconds={waitTimeSeconds} volume={volume} />
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
                              {t(`faq.${k}.answer`)}
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
