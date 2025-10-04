"use client";
import Image from 'next/image';
import { Pattern } from '@/features/guns/types/gun';
import { Timeline } from '@/features/guns/types/gun';
import { Phase } from '@/features/guns/types/gun';
import { timelineToSegments } from '@/features/timer/core/timelineView';
import { useI18n } from '@/i18n/I18nProvider';
import { useHapticFeedback } from '@/shared/hooks/useHapticFeedback';
import { useCentralTheme } from '@/features/timer/hooks/useCentralTheme';

export type CentralDisplayProps = {
  gunName: string;
  gunImage: string;
  gunBName?: string;
  isCompact: boolean;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  totalDurationMs: number;
  currentTimeMs: number;
  pattern: Pattern[];
  timeline: Timeline;
  currentPhase?: Phase | null;
  rootRef?: React.Ref<HTMLDivElement>;
  selectionMode?: 'A' | 'B' | 'AB';
  onChangeSelectionMode?: (mode: 'A' | 'B' | 'AB') => void;
};

export default function CentralDisplay(props: CentralDisplayProps) {
  const triggerHaptic = useHapticFeedback({ duration: 'light' });
  const {
    gunName,
    gunImage,
    gunBName,
    isCompact,
    isPlaying,
    onTogglePlay,
    totalDurationMs,
    currentTimeMs,
    pattern,
    timeline,
    currentPhase,
    rootRef,
    selectionMode,
    onChangeSelectionMode,
  } = props;

  const { t } = useI18n();

  const centralTheme = useCentralTheme({ timeline, pattern, currentTimeMs });

  const totalMs = Math.max(1, totalDurationMs);
  const progressPct = ((currentTimeMs % totalMs) / totalMs) * 100;
  const anchorPct = 10;
  const containerOffsetPct = (100 - anchorPct) + progressPct;
  const elementTranslatePct = (containerOffsetPct % 100) / 3;
  const leftPct = -(elementTranslatePct * 3);

  const segments = timelineToSegments(timeline, { patternA: pattern });
  const segTotal = segments.reduce((acc, s) => acc + s.duration, 0) || 1;
  // Pre-calculated percentages for hatch overlay
  // Reload hatch overlay is omitted in new unified model to keep UI simple and consistent

  // Determine if we're currently within the pattern window for active styling
  const inPattern = true;
  const showOnRight = selectionMode === 'B';
  const headerSideClass = showOnRight ? 'absolute right-3' : 'absolute left-3';
  const headerTopClass = isCompact ? 'top-2' : 'top-3';
  const displayedName = showOnRight ? (gunBName ?? gunName) : gunName;

  const renderCycle = (keyPrefix: string) => (
    <div key={`cycle-${keyPrefix}`} className="relative h-full flex" style={{ width: '100%' }}>
      {segments.map((s, idx) => (
        <div key={`${keyPrefix}-${idx}`} className={`${s.colorClass} relative h-full`} style={{ width: `${(s.duration / segTotal) * 100}%` }} title={`${s.title} • ${s.duration}ms`}>
          {s.symbol && (
            <span className={`absolute inset-0 grid place-items-center text-[9px] leading-none font-extrabold leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)] ${s.textColor ?? 'text-white/90'}`}>{s.symbol}</span>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={`group relative mb-4 rounded-lg border border-white/10 bg-gradient-to-br ${centralTheme.containerBg} min-w-0 overflow-hidden select-none ${isCompact ? 'min-h-[135px]' : 'min-h-[140px] md:min-h-[250px]'}`}
      ref={rootRef}
    >
      <div className={`${headerSideClass} flex items-center gap-2 ${headerTopClass}`}>
        <div className={`${isCompact ? 'w-5 h-5' : 'w-5 h-5'} relative ${inPattern ? '' : 'opacity-60'}`}>
          <Image src={gunImage} alt={gunName} fill className="object-contain invert drop-shadow" sizes="20px" />
        </div>
        <span className={`${isCompact ? 'text-[11px]' : 'text-[11px]'} font-semibold max-w-[25ch] truncate ${inPattern ? 'text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'text-white/60'}`} title={displayedName}>{displayedName}</span>
      </div>

    <div className={`absolute left-1/2 -translate-x-1/2 font-semibold text-white/80 ${isCompact ? 'top-2 text-[11px]' : 'top-3 text-xs'} text-center max-w-[40ch] truncate`}>
        <span className="inline-flex items-center gap-1 align-middle">
          <span>{centralTheme.title}</span>
          {currentPhase?.id === 'reload' && (
            <span className="inline-flex items-center justify-center rounded-md border border-amber-400/50 bg-amber-500/30 text-amber-200 px-1 py-1">
              <Image
                src="/attachments/magazine/Extended_Light_Mag.svg"
                alt="Extended Light Mag"
                width={8}
                height={8}
                className="invert"
              />
            </span>
          )}
        </span>
      </div>

      <div className={`flex items-center justify-center h-full ${isCompact ? 'pt-8' : 'pt-12 md:pt-20'}`}>
        <div className="text-center">
          <div className={`${isCompact ? 'text-[48px] md:text-[64px]' : 'text-[40px] md:text-[56px] lg:text-[84px]'} font-extrabold leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]`}>{centralTheme.symbol}</div>
          {centralTheme.subtitle && (
            <div className={`mt-2 ${isCompact ? 'text-xs' : 'text-sm'} font-semibold ${centralTheme.subtitleColor}`}>{centralTheme.subtitle}</div>
          )}
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-2 px-3">
        <div className="relative">
          <div className="h-3 w-full rounded-md overflow-hidden bg-white/10 border border-white/10 relative">
            <div className="h-full flex absolute top-0 left-0" style={{ width: '300%', left: `${leftPct.toFixed(2)}%` }}>
              {renderCycle('prev')}
              {renderCycle('curr')}
              {renderCycle('next')}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[10%] -translate-x-1/2 -top-3 text-white/80 text-xs select-none">▼</div>
            <div className="absolute left-[10%] -translate-x-1/2 top-0 h-3 w-[2px] bg-white/80" />
          </div>
        </div>
      </div>

      {isCompact && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                onTogglePlay?.();
              }}
              className="rounded-full bg-white/90 text-black text-xs font-semibold px-2.5 py-1.5 shadow-md border border-black/10"
              title={isPlaying ? t('display.stop') : t('display.play')}
              data-central-toggle
            >
              {isPlaying ? '■ ' + t('display.stop') : '▶ ' + t('display.play')}
            </button>
            {onChangeSelectionMode && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  const next = selectionMode === 'A' ? 'B' : (selectionMode === 'B' ? 'AB' : 'A');
                  onChangeSelectionMode(next);
                }}
                className="rounded-full bg-white/90 text-black text-xs font-semibold px-2.5 py-1.5 shadow-md border border-black/10"
                title="Switch mode A/B/Dual"
                data-central-mode
              >
                {selectionMode === 'A' ? `Single: ${gunBName ?? 'Weapon B'}` : (selectionMode === 'B' ? 'Dual' : `Single: ${gunName}`)}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


