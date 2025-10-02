"use client";

import { Gun, Pattern } from "@/features/guns/types/gun";
import { useI18n } from "@/i18n/I18nProvider";
import PatternVisualizer from "@/features/patterns/components/PatternVisualizer";
import StrafeTimer from "@/features/timer/components/StrafeTimer";
import PatternModeSwitcher from "@/features/patterns/components/PatternModeSwitcher";
import Image from "next/image";
import DualPatternVisualizer from "@/features/patterns/components/DualPatternVisualizer";

export default function StandardView({
  gun,
  pattern,
  selectedPatternKey,
  onSelectMode,
  volume,
  onVolumeChange,
  hideHeader = false,
  hideModeSwitcher = false,
  // Dual mode (optional)
  dual = false,
  gunB = null,
  patternB = [],
  selectedPatternKeyB = null,
  selectionMode,
  onChangeSelectionMode,
  activeSide = null,
  onPlayingChange,
  onActiveSideChange,
  useAutoReloadTimeline = false,
}: {
  gun: Gun;
  pattern: Pattern[];
  selectedPatternKey: string | null;
  onSelectMode: (k: string) => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  hideHeader?: boolean;
  hideModeSwitcher?: boolean;
  dual?: boolean;
  gunB?: Gun | null;
  patternB?: Pattern[];
  selectedPatternKeyB?: string | null;
  selectionMode?: 'A' | 'B' | 'AB';
  onChangeSelectionMode?: (mode: 'A' | 'B' | 'AB') => void;
  activeSide?: 'A' | 'B' | null;
  onPlayingChange?: (playing: boolean) => void;
  onActiveSideChange?: (side: 'A' | 'B' | null) => void;
  useAutoReloadTimeline?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      {!hideHeader && !dual && (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 md:w-16 md:h-16 shrink-0">
              <Image src={gun.image} alt={gun.name} fill className="object-contain invert" sizes="48px" />
            </div>
            <div className="min-w-0 pr-6">
              <div className="text-xl font-bold tracking-wide truncate max-w-[35ch]" title={gun.name}>{gun.name}</div>
              {gun.remarks && gun.remarks.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-2 pr-28 md:pr-0">
                  {gun.remarks.map((r, i) => (
                    <span key={i} className="rounded-md border border-purple-400/30 bg-purple-500/10 text-purple-200 text-[11px] px-2 py-0.5">
                      {t(r)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Mode switcher */}
      {!hideModeSwitcher && !dual && (
        <div className="relative mt-2 z-10 md:absolute md:right-6 md:top-6 md:mt-0">
          <PatternModeSwitcher patternMap={gun.pattern} selectedKey={selectedPatternKey} onSelect={onSelectMode} />
        </div>
      )}
      {dual ? (
        <>
          <DualPatternVisualizer patternA={pattern} patternB={patternB ?? []} activeSide={activeSide ?? undefined} />
          <div className="pt-2">
            {gunB ? (
              <StrafeTimer
                gun={gun}
                pattern={pattern}
                volume={volume}
                onVolumeChange={onVolumeChange}
                resetToken={`${selectedPatternKey ?? 'default'}|${selectedPatternKeyB ?? 'default'}`}
                dual
                gunB={gunB}
                patternB={patternB ?? []}
                selectionMode={selectionMode}
                onChangeSelectionMode={onChangeSelectionMode}
                onPlayingChange={onPlayingChange}
                onActiveSideChange={onActiveSideChange}
                useAutoReloadTimeline={useAutoReloadTimeline}
              />
            ) : (
              <StrafeTimer
                gun={gun}
                pattern={pattern}
                volume={volume}
                onVolumeChange={onVolumeChange}
                resetToken={selectedPatternKey ?? undefined}
                gunB={gunB ?? undefined}
                selectionMode={selectionMode}
                onChangeSelectionMode={onChangeSelectionMode}
                onPlayingChange={onPlayingChange}
                onActiveSideChange={onActiveSideChange}
                useAutoReloadTimeline={useAutoReloadTimeline}
              />
            )}
          </div>
        </>
      ) : (
        <>
          <PatternVisualizer gun={gun} pattern={pattern} />
          <div className="pt-2">
            <StrafeTimer
              gun={gun}
              pattern={pattern}
              volume={volume}
              onVolumeChange={onVolumeChange}
              resetToken={selectedPatternKey ?? undefined}
              gunB={gunB ?? undefined}
              selectionMode={selectionMode}
              onChangeSelectionMode={onChangeSelectionMode}
              onPlayingChange={onPlayingChange}
              onActiveSideChange={onActiveSideChange}
            />
          </div>
        </>
      )}
    </div>
  );
}


