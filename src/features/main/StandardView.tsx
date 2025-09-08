"use client";

import { Gun, Pattern } from "@/features/guns/types/gun";
import PatternVisualizer from "@/features/patterns/components/PatternVisualizer";
import StrafeTimer from "@/features/timer/components/StrafeTimer";
import PatternModeSwitcher from "@/features/patterns/components/PatternModeSwitcher";

export default function StandardView({
  gun,
  pattern,
  selectedPatternKey,
  onSelectMode,
  volume,
  onVolumeChange,
}: {
  gun: Gun;
  pattern: Pattern[];
  selectedPatternKey: string | null;
  onSelectMode: (k: string) => void;
  volume: number;
  onVolumeChange: (v: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-12 h-12 md:w-16 md:h-16 shrink-0">
            <img src={gun.image} alt={gun.name} className="absolute inset-0 w-full h-full object-contain invert" />
          </div>
          <div className="min-w-0 pr-6">
            <div className="text-xl font-bold tracking-wide truncate max-w-[35ch]" title={gun.name}>{gun.name}</div>
            {gun.remarks && gun.remarks.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-2 pr-28 md:pr-0">
                {gun.remarks.map((r, i) => (
                  <span key={i} className="rounded-md border border-purple-400/30 bg-purple-500/10 text-purple-200 text-[11px] px-2 py-0.5">
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Mode switcher */}
      <div className="relative mt-2 z-10 md:absolute md:right-6 md:top-6 md:mt-0">
        <PatternModeSwitcher patternMap={gun.pattern} selectedKey={selectedPatternKey} onSelect={onSelectMode} />
      </div>
      <PatternVisualizer gun={gun} pattern={pattern} />
      <div className="pt-2">
        <StrafeTimer gun={gun} pattern={pattern} volume={volume} onVolumeChange={onVolumeChange} resetToken={selectedPatternKey ?? undefined} />
      </div>
    </div>
  );
}


