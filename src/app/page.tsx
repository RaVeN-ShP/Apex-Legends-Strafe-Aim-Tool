"use client";

import { useEffect, useMemo, useState } from "react";
import { Gun, Pattern } from "@/features/guns/types/gun";
// import { DEFAULT_DELAY_SECONDS } from "@/config/constants";
import { guns } from "@/features/guns/data/guns";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/shared/components/LanguageSwitcher";
import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useCustomProfiles, profileToGun } from "@/features/customProfiles/useCustomProfiles";
import GunsSidebar from "@/features/guns/GunsSidebar";
import CustomProfileEditor from "@/features/customProfiles/CustomProfileEditor";
import StandardView from "@/features/main/StandardView";
// Custom profiles are managed via hook for storage compatibility

export default function Home() {
  const [selectedGun, setSelectedGun] = useState<Gun | null>(guns[0] ?? null);
  const [selectedModeId, setSelectedModeId] = useState<string | null>(null);
  // Preserved for future features; currently unused
  // const [waitTimeSeconds] = useState(DEFAULT_DELAY_SECONDS);
  const [volume, setVolume] = useState(0.8);
  const { t } = useI18n();
  const { profiles, addProfile, updateProfile, removeProfile, gunsFromProfiles } = useCustomProfiles();
  const [isEditing, setIsEditing] = useState(false);
  const [editorContext, setEditorContext] = useState<{ id: string | null; name: string; steps: Pattern[]; reloadTimeSeconds?: number }>({ id: null, name: "", steps: [{ type: 'direction', direction: 'left', duration: 200 }], reloadTimeSeconds: undefined });
  const [editorResetToken, setEditorResetToken] = useState<number>(0);


  const allGuns: Gun[] = useMemo(() => {
    return [
      ...gunsFromProfiles,
      ...guns,
    ];
  }, [gunsFromProfiles]);

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
    // const reload = Math.max(0, Math.min(DELAY_SLIDER_MAX_SECONDS, selectedGun.reloadTimeSeconds ?? 0));
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

  const confirmDiscardIfEditing = (): boolean => {
    if (!isEditing) return true;
    const ok = window.confirm(t('custom.confirmDiscard', { defaultValue: 'Discard current changes?' }));
    if (!ok) return false;
    // Signal child editor to reset its internal state on next open
    setEditorResetToken((v) => v + 1);
    return true;
  };

  const handleStartCreate = () => {
    if (!confirmDiscardIfEditing()) return;
    setIsEditing(true);
    setEditorContext({ id: null, name: "", steps: [{ type: 'direction', direction: 'left', duration: 200 }], reloadTimeSeconds: 1.5 });
    setEditorResetToken((v) => v + 1);
  };

  const handleStartEdit = (profileId: string) => {
    const p = profiles.find((x) => x.id === profileId);
    if (!p) return;
    if (!confirmDiscardIfEditing()) return;
    setIsEditing(true);
    setEditorContext({ id: p.id, name: p.name, steps: p.strafePattern.map((s) => ({ ...s })), reloadTimeSeconds: p.reloadTimeSeconds });
    setEditorResetToken((v) => v + 1);
  };

  const handleStartCopy = (name: string, steps: Pattern[], reloadTimeSeconds?: number) => {
    if (!confirmDiscardIfEditing()) return;
    setIsEditing(true);
    setEditorContext({ id: null, name, steps: steps.map((s) => ({ ...s })), reloadTimeSeconds });
    setEditorResetToken((v) => v + 1);
  };

  const handleEditorCancel = () => {
    setIsEditing(false);
    setEditorContext({ id: null, name: "", steps: [{ type: 'direction', direction: 'left', duration: 200 }], reloadTimeSeconds: 1.5 });
  };

  const handleEditorSave = (name: string, steps: Pattern[], reloadTimeSeconds: number) => {
    if (editorContext.id) {
      const updated = { id: editorContext.id, name, strafePattern: steps, reloadTimeSeconds };
      updateProfile(updated);
      setSelectedGun(profileToGun(updated));
    } else {
      const created = addProfile({ name, strafePattern: steps, reloadTimeSeconds });
      setSelectedGun(profileToGun(created));
    }
    setIsEditing(false);
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
          <aside className="order-2 md:order-1 self-start">
            <GunsSidebar
              guns={allGuns}
              selectedGun={selectedGun}
              selectedPatternKey={selectedPatternKey}
              onSelectGun={(g) => { setSelectedGun(g); setIsEditing(false); }}
              onStartCreate={handleStartCreate}
              onStartEdit={handleStartEdit}
              onStartCopy={(name, steps, reloadTimeSeconds) => handleStartCopy(name, steps, reloadTimeSeconds)}
              onDeleteProfile={(id) => { removeProfile(id); }}
            />
          </aside>

          {/* Right Column: Main + FAQ stacked */}
          <div className="order-1 md:order-2 md:col-start-2 self-start flex flex-col gap-6">
            {/* Main Section */}
            <section className="relative rounded-xl border border-white/10 bg-black/20 p-4 md:p-6 text-white">
              {isEditing ? (
                <CustomProfileEditor
                  allGuns={allGuns}
                  initialName={editorContext.name}
                  initialSteps={editorContext.steps}
                  initialReloadTimeSeconds={editorContext.reloadTimeSeconds}
                  volume={volume}
                  onVolumeChange={setVolume}
                  resetToken={editorResetToken}
                  onCancel={handleEditorCancel}
                  onSave={handleEditorSave}
                />
              ) : selectedGun ? (
                <div className="space-y-6">
                  <StandardView
                    gun={selectedGun}
                    pattern={selectedPattern}
                    selectedPatternKey={selectedPatternKey}
                    onSelectMode={(k) => setSelectedModeId(k)}
                    volume={volume}
                    onVolumeChange={setVolume}
                  />
                
                </div>
              ) : (
                <div className="text-white/70">{t('main.selectPrompt')}</div>
              )}
            </section>
            {/* FAQ Container - show only with StandardView (not editing) */}
            {!isEditing && selectedGun ? (
              <section className="rounded-xl border border-white/10 bg-black/20 p-4 md:p-6 text-white">
                <h2 className="text-lg font-bold mb-4">{t('faq.title')}</h2>
                <div className="space-y-2">
                  {['q0','q1','q2','q3'].map((k) => (
                    <Disclosure key={k}>
                      {({ open }) => (
                        <div className="rounded-md border border-white/10 bg-white/5">
                          <Disclosure.Button className="w-full flex items-center justify-between px-3 py-2 text-left">
                            <span className="text-sm font-semibold text-white/90">{t(`faq.${k}.question`)}</span>
                            <ChevronDownIcon className={`w-4 h-4 text-white/70 transition-transform ${open ? 'rotate-180' : ''}`} />
                          </Disclosure.Button>
                          <Disclosure.Panel className="px-3 pb-3 text-xs text-white/70">
                            {k === 'q3' ? (
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
              </section>
            ) : null}
          </div>
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
