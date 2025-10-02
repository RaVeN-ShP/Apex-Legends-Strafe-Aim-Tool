"use client";

import { useEffect, useMemo, useState } from "react";
import { Gun, Pattern } from "@/features/guns/types/gun";
// import { DEFAULT_DELAY_SECONDS } from "@/config/constants";
import { guns } from "@/features/guns/data/guns";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/shared/components/LanguageSwitcher";
import { useHapticFeedback } from "@/shared/hooks/useHapticFeedback";
import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useCustomProfiles, profileToGun } from "@/features/customProfiles/useCustomProfiles";
import GunsSidebar from "@/features/guns/GunsSidebar";
import CustomProfileEditor from "@/features/customProfiles/CustomProfileEditor";
import StandardView from "@/features/main/StandardView";
import PatternModeSwitcher from "@/features/patterns/components/PatternModeSwitcher";
import Image from "next/image";
// Dual playback context removed; state is lifted locally
import { UIColors } from "@/config/styles";
import { BUILD_DATE_ISO, CURRENT_APEX_SEASON } from "@/config/constants";
// Custom profiles are managed via hook for storage compatibility

type SelectionMode = 'A' | 'B' | 'AB';

export default function Home() {
  // Two gun slots
  const [selectedGunA, setSelectedGunA] = useState<Gun | null>(guns[0] ?? null);
  const [selectedGunB, setSelectedGunB] = useState<Gun | null>(guns[1] ?? guns[0] ?? null);
  // Variant (pattern key) per gun slot
  const [selectedModeAId, setSelectedModeAId] = useState<string | null>(null);
  const [selectedModeBId, setSelectedModeBId] = useState<string | null>(null);
  // A/B/AB selection mode
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('A');
  const [lastSingleMode, setLastSingleMode] = useState<Exclude<SelectionMode, 'AB'>>('A');
  // Preserved for future features; currently unused
  // const [waitTimeSeconds] = useState(DEFAULT_DELAY_SECONDS);
  const [volume, setVolume] = useState(0.8);
  const { t } = useI18n();
  const { profiles, addProfile, updateProfile, removeProfile, gunsFromProfiles } = useCustomProfiles();
  const triggerHaptic = useHapticFeedback({ duration: 'light' });
  const [isEditing, setIsEditing] = useState(false);
  const [editorContext, setEditorContext] = useState<{ id: string | null; name: string; steps: Pattern[]; reloadTimeSeconds?: number }>({ id: null, name: "", steps: [{ type: 'direction', direction: 'left', duration: 200 }], reloadTimeSeconds: undefined });
  const [editorResetToken, setEditorResetToken] = useState<number>(0);


  const allGuns: Gun[] = useMemo(() => {
    return [
      ...gunsFromProfiles,
      ...guns,
    ];
  }, [gunsFromProfiles]);

  // Reset/initialize variant when switching guns per slot
  useEffect(() => {
    if (!selectedGunA) {
      setSelectedModeAId(null);
    } else {
      const keys = Object.keys(selectedGunA.pattern ?? {});
      if (keys.length > 1) {
        setSelectedModeAId((prev) => (prev && keys.includes(prev)) ? prev : (keys.includes('default') ? 'default' : keys[0]));
      } else {
        setSelectedModeAId(keys[0] ?? null);
      }
    }
  }, [selectedGunA]);

  useEffect(() => {
    if (!selectedGunB) {
      setSelectedModeBId(null);
    } else {
      const keys = Object.keys(selectedGunB.pattern ?? {});
      if (keys.length > 1) {
        setSelectedModeBId((prev) => (prev && keys.includes(prev)) ? prev : (keys.includes('default') ? 'default' : keys[0]));
      } else {
        setSelectedModeBId(keys[0] ?? null);
      }
    }
  }, [selectedGunB]);

  // Track last single mode (A or B) to return to when toggling dual
  useEffect(() => {
    if (selectionMode !== 'AB') {
      setLastSingleMode(selectionMode);
    }
  }, [selectionMode]);

  // Effective selections per slot
  const selectedPatternKeyA: string | null = useMemo(() => {
    if (!selectedGunA) return null;
    const keys = Object.keys(selectedGunA.pattern ?? {});
    if (keys.length <= 1) return keys[0] ?? 'default';
    if (selectedModeAId && keys.includes(selectedModeAId)) return selectedModeAId;
    return keys.includes('default') ? 'default' : keys[0];
  }, [selectedGunA, selectedModeAId]);

  const selectedPatternKeyB: string | null = useMemo(() => {
    if (!selectedGunB) return null;
    const keys = Object.keys(selectedGunB.pattern ?? {});
    if (keys.length <= 1) return keys[0] ?? 'default';
    if (selectedModeBId && keys.includes(selectedModeBId)) return selectedModeBId;
    return keys.includes('default') ? 'default' : keys[0];
  }, [selectedGunB, selectedModeBId]);

  const selectedPatternA: Pattern[] = useMemo(() => {
    if (!selectedGunA) return [];
    const all = selectedGunA.pattern ?? {};
    const key = selectedPatternKeyA ?? (Object.keys(all)[0] ?? 'default');
    return all[key] ?? [];
  }, [selectedGunA, selectedPatternKeyA]);

  const selectedPatternB: Pattern[] = useMemo(() => {
    if (!selectedGunB) return [];
    const all = selectedGunB.pattern ?? {};
    const key = selectedPatternKeyB ?? (Object.keys(all)[0] ?? 'default');
    return all[key] ?? [];
  }, [selectedGunB, selectedPatternKeyB]);

  // Which slot is currently controlled by selections from the sidebar
  const activeSlot: SelectionMode = selectionMode;
  const displayGun: Gun | null = useMemo(() => {
    if (activeSlot === 'B') return selectedGunB;
    return selectedGunA;
  }, [activeSlot, selectedGunA, selectedGunB]);
  const displayPatternKey: string | null = useMemo(() => {
    if (activeSlot === 'B') return selectedPatternKeyB;
    return selectedPatternKeyA;
  }, [activeSlot, selectedPatternKeyA, selectedPatternKeyB]);
  const displayPattern: Pattern[] = useMemo(() => {
    if (activeSlot === 'B') return selectedPatternB;
    return selectedPatternA;
  }, [activeSlot, selectedPatternA, selectedPatternB]);

  // Dual mode moved to /advanced

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
    // Scroll to top of the page when editor opens
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartEdit = (profileId: string) => {
    const p = profiles.find((x) => x.id === profileId);
    if (!p) return;
    if (!confirmDiscardIfEditing()) return;
    setIsEditing(true);
    setEditorContext({ id: p.id, name: p.name, steps: p.strafePattern.map((s) => ({ ...s })), reloadTimeSeconds: p.reloadTimeSeconds });
    setEditorResetToken((v) => v + 1);
    // Scroll to top of the page when editor opens
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartCopy = (name: string, steps: Pattern[], reloadTimeSeconds?: number) => {
    if (!confirmDiscardIfEditing()) return;
    setIsEditing(true);
    setEditorContext({ id: null, name, steps: steps.map((s) => ({ ...s })), reloadTimeSeconds });
    setEditorResetToken((v) => v + 1);
    // Scroll to top of the page when editor opens
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditorCancel = () => {
    setIsEditing(false);
    setEditorContext({ id: null, name: "", steps: [{ type: 'direction', direction: 'left', duration: 200 }], reloadTimeSeconds: 1.5 });
  };

  const handleEditorSave = (name: string, steps: Pattern[], reloadTimeSeconds: number) => {
    if (editorContext.id) {
      const updated = { id: editorContext.id, name, strafePattern: steps, reloadTimeSeconds };
      updateProfile(updated);
      if (selectionMode === 'B') {
        setSelectedGunB(profileToGun(updated));
      } else {
        setSelectedGunA(profileToGun(updated));
      }
    } else {
      const created = addProfile({ name, strafePattern: steps, reloadTimeSeconds });
      if (selectionMode === 'B') {
        setSelectedGunB(profileToGun(created));
      } else {
        setSelectedGunA(profileToGun(created));
      }
    }
    setIsEditing(false);
  };

  const FaqSection = () => {
    if (isEditing || !displayGun) return null;
    return (
      <section className={`rounded-xl border ${UIColors.border.primary} ${UIColors.background.primary} p-4 md:p-6 ${UIColors.text.primary}`}>
        <h2 className="text-lg font-bold mb-4">{t('faq.title')}</h2>
        <div className="space-y-2">
          {['q0', 'q1', 'q2', 'q3', 'q4'].map((k) => (
            <Disclosure key={k}>
              {({ open }) => (
                <div className={`rounded-md border ${UIColors.border.primary} ${UIColors.background.secondary}`}>
                  <Disclosure.Button className="w-full flex items-center justify-between px-3 py-2 text-left">
                    <span className={`text-sm font-semibold ${UIColors.text.secondary}`}>{t(`faq.${k}.question`)}</span>
                    <ChevronDownIcon className={`w-4 h-4 ${UIColors.text.muted} transition-transform ${open ? 'rotate-180' : ''}`} />
                  </Disclosure.Button>
                  <Disclosure.Panel className={`px-3 pb-3 text-xs ${UIColors.text.muted}`}>
                    {k === 'q3' ? (
                      <div>
                        <div>{t(`faq.${k}.answer`, { weapon: displayGun?.name ?? '-' })}</div>
                        <div className={`mt-1 ${UIColors.text.disabled}`}>{t(`faq.${k}.formula`, { weapon: displayGun?.name ?? '-' })}</div>
                      </div>
                    ) : t(`faq.${k}.answer`)}
                  </Disclosure.Panel>
                </div>
              )}
            </Disclosure>
          ))}
        </div>
      </section>
    );
  };

  // Dual playback state lifted here
  const [activeSide, setActiveSide] = useState<'A' | 'B' | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Scroll-to-top button visibility state
  const [showScrollToTop, setShowScrollToTop] = useState<boolean>(false);

  // Function to scroll to gun list on mobile
  const scrollToGunList = () => {
    // Only scroll on mobile (when sidebar is below main content)
    const gunListElement = document.querySelector('aside');
    if (gunListElement) {
      gunListElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  // Function to scroll back to top/main content
  const scrollToTop = () => {
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  };

  // Scroll detection effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollThreshold = 300; // Show button after scrolling 300px
      setShowScrollToTop(window.scrollY > scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 py-6 px-4 text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 pr-20 md:pr-0">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                <span className="block md:hidden">
                  <span className="block">Apex</span>
                  <span className="block">Legends</span>
                  <span className="block">Recoil Strafe Trainer</span>
                </span>
                <span className="hidden md:block">{t('app.title')}</span>
              </h1>
              <p className={`${UIColors.text.tertiary} mt-2 text-sm md:text-base`}>
                {t('app.subtitle.before')}
                <a href="https://x.com/ahn99fps" target="_blank" rel="noreferrer" className={UIColors.link.default}>
                  ahn99
                </a>
                {t('app.subtitle.after')}
              </p>
            </div>
            <div className="absolute top-0 right-0 md:relative md:top-auto md:right-auto shrink-0">
              <div className={`rounded-md border ${UIColors.border.primary} ${UIColors.background.primary} px-3 py-2`}>
                <LanguageSwitcher />
              </div>
            </div>
          </div>
          <p className={`${UIColors.text.disabled} mt-2 text-xs md:text-sm`}>
            References: {" "}
            <a href="https://docs.google.com/document/d/1olISc98UQ2ucUlvm3pGEt5sqG7Qf4LC7I2HnmTOB7w4/edit?tab=t.0" target="_blank" rel="noreferrer" className={UIColors.link.default}>
              {t('refs.doc')}
            </a>{" "}•{" "}
            <a href="https://www.youtube.com/watch?v=fPLSisfQGlE" target="_blank" rel="noreferrer" className={UIColors.link.default}>
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
              selectedGun={displayGun}
              selectedPatternKey={displayPatternKey}
              selectionMode={selectionMode}
              highlightGunIdA={selectedGunA?.id ?? null}
              highlightGunIdB={selectedGunB?.id ?? null}
              onSelectGun={(g, side) => {
                const target = side ?? (selectionMode === 'B' ? 'B' : 'A');
                if (target === 'B') setSelectedGunB(g);
                else setSelectedGunA(g);
                setIsEditing(false);
              }}
              onStartCreate={handleStartCreate}
              onStartEdit={handleStartEdit}
              onDeleteProfile={(id) => { removeProfile(id); }}
            />
          </aside>

          {/* Right Column: Main + FAQ stacked */}
          <div className="order-1 md:order-2 md:col-start-2 self-start flex flex-col gap-6">
            {/* Main Section */}
            <section className={`relative rounded-xl border ${UIColors.border.primary} ${UIColors.background.primary} p-4 md:p-6 ${UIColors.text.primary}`}>
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
                  existingProfiles={profiles}
                />
              ) : displayGun ? (
                    (
                      <div className="space-y-6">
                        {/* Top three boxes: Gun A, Center Toggle, Gun B */}
                        <div className="grid grid-cols-2 md:grid-cols-[1fr_auto_1fr] items-stretch gap-3">
                          {/* Gun A box */}
                          <div
                            className={`rounded-lg border ${selectionMode === 'B' ? `${UIColors.gunSlot.a.inactive.border} ${UIColors.gunSlot.a.inactive.background}` : selectionMode === 'AB' ? `${UIColors.gunSlot.dual.border} ${UIColors.gunSlot.dual.background}` : `${UIColors.gunSlot.a.active.border} ${UIColors.gunSlot.a.active.background}`} p-3 cursor-pointer transition-colors order-1 md:order-none`}
                            onClick={() => setSelectionMode('A')}
                            onDoubleClick={scrollToGunList}
                            onDragOver={(e) => {
                              if (e.dataTransfer.types.includes('application/x-gun-id') || e.dataTransfer.types.includes('text/plain')) {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'copy';
                              }
                            }}
                            onDrop={(e) => {
                              const id = e.dataTransfer.getData('application/x-gun-id') || e.dataTransfer.getData('text/plain');
                              if (!id) return;
                              const g = allGuns.find(x => x.id === id);
                              if (g) {
                                setSelectedGunA(g);
                              }
                            }}
                          >
                            {selectedGunA ? (
                              <div className={`flex items-start gap-3 ${selectionMode === 'B' ? UIColors.gunSlot.a.inactive.content : ''} ${selectionMode === 'AB' && isPlaying && activeSide === 'B' ? UIColors.gunSlot.dual.contentInactive : ''}`}>
                                <div className="relative w-12 h-12 md:w-16 md:h-16 shrink-0">
                                  <Image src={selectedGunA.image} alt={selectedGunA.name} fill className="object-contain invert" sizes="64px" />
                                </div>
                                <div className="min-w-0 flex-1 flex flex-col md:flex-row items-start md:items-start md:justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-base font-bold tracking-wide truncate max-w-[35ch]" title={selectedGunA.name}>{selectedGunA.name}</div>

                                    <div className="mt-2 flex items-center gap-2">
                                      <span className={`inline-flex items-center justify-center rounded-md border ${UIColors.attachment.magazine.border} ${UIColors.attachment.magazine.background} ${UIColors.attachment.magazine.text} px-2 py-1`}>
                                        <Image
                                          src="/attachments/magazine/Extended_Light_Mag.svg"
                                          alt="Extended Light Mag"
                                          width={16}
                                          height={16}
                                          className="invert"
                                        />
                                      </span>
                                      <span className={`inline-flex items-center justify-center rounded-md border ${UIColors.attachment.stock.border} ${UIColors.attachment.stock.background} ${UIColors.attachment.stock.text} px-2 py-1`}>
                                        <Image
                                          src="/attachments/Standard_Stock.svg"
                                          alt="Standard Stock"
                                          width={16}
                                          height={16}
                                          className="invert"
                                        />
                                      </span>
                                    </div>
                                  </div>
                                  <PatternModeSwitcher
                                    patternMap={selectedGunA.pattern}
                                    selectedKey={selectedPatternKeyA}
                                    onSelect={(k) => setSelectedModeAId(k)}
                                    className="order-2 md:order-none w-full md:w-auto flex flex-row md:flex-col flex-wrap md:flex-nowrap items-start md:items-end gap-2"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className={`${UIColors.text.disabled} text-sm`}>{t('main.selectPrompt')}</div>
                            )}
                          </div>

                          {/* Center square toggle */}
                          <div className="flex flex-col items-center justify-center order-3 col-span-2 md:order-none md:col-span-1 md:col-start-2">
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic();
                                if (selectionMode === 'AB') {
                                  setSelectionMode(lastSingleMode);
                                } else {
                                  setLastSingleMode(selectionMode);
                                  setSelectionMode('AB');
                                }
                              }}
                              className={`${selectionMode === 'AB' ? `${UIColors.dualToggle.active.border} ${UIColors.dualToggle.active.background} ${UIColors.dualToggle.active.hover}` : `${UIColors.dualToggle.inactive.border} ${UIColors.dualToggle.inactive.background} ${UIColors.dualToggle.inactive.hover}`} relative w-full h-12 md:w-14 md:h-20 rounded-md border transition-colors flex flex-col items-center justify-center`}
                              aria-label="Toggle Dual"
                              title="Toggle Dual"
                            >
                              {/* Top text label (plain text) */}
                              <span className={`mt-1 text-xs font-semibold ${selectionMode === 'AB' ? UIColors.dualToggle.active.text : UIColors.dualToggle.inactive.text}`}>
                                {t('tabs.dual')}
                              </span>

                              {/* Bottom icon area (fixed size, centered) */}
                              <div className="hidden md:flex items-center justify-center mb-1">
                                <div className="relative h-10 w-10">
                                  <Image
                                    src="/weapons/ar/R-301_Carbine_Icon.svg"
                                    alt="R301 A"
                                    fill
                                    className={`object-contain invert drop-shadow transition-opacity ${selectionMode === 'B' ? 'opacity-30' : 'opacity-100'
                                      }`}
                                    sizes="40px"
                                    style={{
                                      transform: 'rotate(-45deg) scale(-1) translate(0, 15%)',
                                      transformOrigin: '50% 50%',
                                    }}
                                  />

                                  <Image
                                    src="/weapons/ar/R-301_Carbine_Icon.svg"
                                    alt="R301 B"
                                    fill
                                    className={`object-contain invert drop-shadow transition-opacity ${selectionMode === 'A' ? 'opacity-30' : 'opacity-100'
                                      }`}
                                    sizes="40px"
                                    style={{
                                      transform: 'rotate(-225deg) scale(-1) translate(0, 15%)',
                                      transformOrigin: '50% 50%',
                                    }}
                                  />
                                </div>
                              </div>
                            </button>
                          </div>

                          {/* Gun B box */}
                          <div
                            className={`rounded-lg border ${selectionMode === 'A' ? `${UIColors.gunSlot.b.inactive.border} ${UIColors.gunSlot.b.inactive.background}` : selectionMode === 'AB' ? `${UIColors.gunSlot.dual.border} ${UIColors.gunSlot.dual.background}` : `${UIColors.gunSlot.b.active.border} ${UIColors.gunSlot.b.active.background}`} p-3 cursor-pointer transition-colors order-2 md:order-none`}
                            onClick={() => setSelectionMode('B')}
                            onDoubleClick={scrollToGunList}
                            onDragOver={(e) => {
                              if (e.dataTransfer.types.includes('application/x-gun-id') || e.dataTransfer.types.includes('text/plain')) {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'copy';
                              }
                            }}
                            onDrop={(e) => {
                              const id = e.dataTransfer.getData('application/x-gun-id') || e.dataTransfer.getData('text/plain');
                              if (!id) return;
                              const g = allGuns.find(x => x.id === id);
                              if (g) {
                                setSelectedGunB(g);
                              }
                            }}
                          >
                            {selectedGunB ? (
                              <div className={`flex items-start gap-3 ${selectionMode === 'A' ? UIColors.gunSlot.b.inactive.content : ''} ${selectionMode === 'AB' && isPlaying && activeSide === 'A' ? UIColors.gunSlot.dual.contentInactive : ''}`}>
                                <div className="relative w-12 h-12 md:w-16 md:h-16 shrink-0">
                                  <Image src={selectedGunB.image} alt={selectedGunB.name} fill className="object-contain invert" sizes="64px" />
                                </div>
                                <div className="min-w-0 flex-1 flex flex-col md:flex-row items-start md:items-start md:justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-base font-bold tracking-wide truncate max-w-[35ch]" title={selectedGunB.name}>{selectedGunB.name}</div>

                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="inline-flex items-center justify-center rounded-md border border-amber-400/50 bg-amber-500/30 text-amber-200 px-2 py-1">
                                        <Image
                                          src="/attachments/magazine/Extended_Light_Mag.svg"
                                          alt="Extended Light Mag"
                                          width={16}
                                          height={16}
                                          className="invert"
                                        />
                                      </span>
                                      <span className={`inline-flex items-center justify-center rounded-md border ${UIColors.attachment.stock.border} ${UIColors.attachment.stock.background} ${UIColors.attachment.stock.text} px-2 py-1`}>
                                        <Image
                                          src="/attachments/Standard_Stock.svg"
                                          alt="Standard Stock"
                                          width={16}
                                          height={16}
                                          className="invert"
                                        />
                                      </span>
                                    </div>
                                  </div>
                                  <PatternModeSwitcher
                                    patternMap={selectedGunB.pattern}
                                    selectedKey={selectedPatternKeyB}
                                    onSelect={(k) => setSelectedModeBId(k)}
                                    className="order-2 md:order-none w-full md:w-auto flex flex-row md:flex-col flex-wrap md:flex-nowrap items-start md:items-end gap-2"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className={`${UIColors.text.disabled} text-sm`}>{t('main.selectPrompt')}</div>
                            )}
                          </div>
                        </div>

                        <StandardView
                          gun={selectionMode === 'B' ? (selectedGunB ?? displayGun!) : (selectedGunA ?? displayGun!)}
                          pattern={selectionMode === 'B' ? selectedPatternB : selectedPatternA}
                          selectedPatternKey={selectionMode === 'B' ? selectedPatternKeyB : selectedPatternKeyA}
                          onSelectMode={(k) => {
                            if (selectionMode === 'B') setSelectedModeBId(k); else setSelectedModeAId(k);
                          }}
                          volume={volume}
                          onVolumeChange={setVolume}
                          hideHeader
                          hideModeSwitcher
                          dual={selectionMode === 'AB'}
                          gunB={selectedGunB}
                          patternB={selectionMode === 'AB' ? selectedPatternB : []}
                          selectedPatternKeyB={selectionMode === 'AB' ? selectedPatternKeyB : null}
                          selectionMode={selectionMode}
                          onChangeSelectionMode={(m) => setSelectionMode(m)}
                          activeSide={activeSide}
                          onPlayingChange={setIsPlaying}
                          onActiveSideChange={setActiveSide}
                        />

                      </div>
                    )
              ) : (
                <div className={UIColors.text.muted}>{t('main.selectPrompt')}</div>
              )}
            </section>
            {/* FAQ: visible here on md+ only */}
            <div className="hidden md:block">
              <FaqSection />
            </div>
          </div>
        </div>

        {/* FAQ: move to bottom on mobile */}
        <div className="md:hidden mt-6">
          <FaqSection />
        </div>

        {/* Footer */}
        <footer className={`mt-8 text-center text-xs ${UIColors.text.subtle}`}>
          <div className="inline-flex gap-2">
            <span>{t('footer.credit', { name: 'RaVeN_ShP' })}</span>
            <span>•</span>
            <a href="https://www.youtube.com/@Mokeysniper" target="_blank" rel="noreferrer" className={UIColors.link.default}>Mokeysniper</a>
          </div>
          <div className="mt-1">
            <span className={UIColors.text.disabled}>{t('footer.contributors')}</span>
            <span className="ml-1 inline-flex gap-2">
              <a href="https://www.youtube.com/@ahn99fps" target="_blank" rel="noreferrer" className={UIColors.link.default}>ahn99</a>
            </span>
          </div>
          <div className="mt-1">
            <span className={UIColors.text.disabled}>{t('footer.upToDate')}</span>
            <span className="ml-1">{CURRENT_APEX_SEASON}</span>
          </div>
          {/* <div className="mt-1">
            <span className={UIColors.text.disabled}>{t('footer.lastUpdate')}</span>
            <span className="ml-1">{new Date(BUILD_DATE_ISO || Date.now()).toLocaleDateString()}</span>
          </div> */}
        </footer>
      </div>

      {/* Floating scroll-to-top button - mobile only */}
      <button
        onClick={scrollToTop}
        className={`md:hidden fixed bottom-6 right-6 w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl z-50 transition-all duration-300 ease-out ${
          showScrollToTop 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-75 translate-y-2 pointer-events-none'
        }`}
        aria-label="Scroll to top"
        title="Scroll to top"
      >
        <svg
          className="w-6 h-6 text-white transition-transform duration-200 hover:scale-110"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </button>
    </main>
  );
}
