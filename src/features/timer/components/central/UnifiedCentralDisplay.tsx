"use client";
import Image from 'next/image';
import CoreCentral from '@/features/timer/components/central/CoreCentral';
import type { CoreCentralOverlay, CoreCentralOverlaySelection } from '@/features/timer/components/central/CoreCentral';
import { Pattern, Timeline, Phase } from '@/features/guns/types/gun';
import { timelineToSegments } from '@/features/timer/core/timelineView';
import { useI18n } from '@/i18n/I18nProvider';
import { useCentralTheme } from '@/features/timer/hooks/useCentralTheme';
import { findNextStartSide, getActiveSide } from '@/features/timer/core/timeline';
import { useEffect, useRef, useState } from 'react';

export type UnifiedCentralDisplayProps = {
  // Common
  isCompact: boolean;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  totalDurationMs: number;
  currentTimeMs: number;
  timeline: Timeline;
  currentPhase?: Phase | null;
  selectionMode?: 'A' | 'B' | 'AB';
  onChangeSelectionMode?: (mode: 'A' | 'B' | 'AB') => void;
  rootRef?: React.Ref<HTMLDivElement>;

  // Single mode
  gunAName: string;
  gunAImage: string;
  patternA: Pattern[];
  headerSide?: 'left' | 'right';
  /** Total reload duration in ms (from empty). Used for single-mode overlay width. */
  reloadDurationMs?: number;

  // Dual mode extras
  reloadADurationMs?: number;
  reloadBDurationMs?: number;
  manualDualReload?: boolean;
  autoDualReload?: boolean;

  // Dual mode (optional). If provided, renders dual headers and behaviors.
  gunBName?: string;
  gunBImage?: string;
  patternB?: Pattern[];
  activeSide?: 'A' | 'B' | null;
};

export default function UnifiedCentralDisplay(props: UnifiedCentralDisplayProps) {
  const {
    isCompact,
    isPlaying,
    onTogglePlay,
    totalDurationMs,
    currentTimeMs,
    timeline,
    currentPhase,
    selectionMode,
    onChangeSelectionMode,
    rootRef,
    gunAName,
    gunAImage,
    patternA,
    headerSide = 'left',
    reloadDurationMs,
    reloadADurationMs,
    reloadBDurationMs,
    manualDualReload,
    autoDualReload,
    gunBName,
    gunBImage,
    patternB,
    activeSide,
  } = props;

  const { t } = useI18n();

  const isDual = !!(gunBName && gunBImage && patternB);
  const totalMs = Math.max(1, totalDurationMs);
  const now = ((currentTimeMs % totalMs) + totalMs) % totalMs;

  // Determine theme-driving pattern (same logic as previous components)
  const themeSide = currentPhase?.id === 'pattern' ? (currentPhase.side ?? (isDual ? (getActiveSide(timeline, now) ?? 'A') : 'A')) : (isDual ? (getActiveSide(timeline, now) ?? 'A') : 'A');
  const themePattern = themeSide === 'B' && isDual && patternB ? patternB : patternA;
  const centralTheme = useCentralTheme({ timeline, pattern: themePattern, currentTimeMs });

  const [firstCycle, setFirstCycle] = useState(true);
  const [goldMagDelayOk, setGoldMagDelayOk] = useState(false);
  const prevNowRef = useRef<number>(now);

  // Build progress segments
  const segments = isDual
    ? timelineToSegments(timeline, { patternA, patternB, t })
    : timelineToSegments(timeline, { patternA: patternA, t });

  // Inter-phase handling for dual: show swap indicator
  let swapDisplay: { target: 'A' | 'B' } | null = null;
  if (isDual && (currentPhase?.id === 'swap' || currentPhase?.id === 'delay' || currentPhase?.id === 'reload')) {
    const nextSide = findNextStartSide(timeline, now) || 'A';
    if (currentPhase?.id === 'swap') {
      swapDisplay = { target: nextSide };
    }
  }

  useEffect(() => {
    if(isPlaying === false)
      setFirstCycle(true)  ;
  }, [isPlaying]);

  // After each swap, delay showing gold mag by ~400ms to avoid competing with active emphasis
  useEffect(() => {
    if (!isDual) { setGoldMagDelayOk(false); return; }
    // Detect swap by phase id
    if (currentPhase?.id === 'swap') {
      setGoldMagDelayOk(false);
      const timer = setTimeout(() => setGoldMagDelayOk(true), 400);
      return () => clearTimeout(timer);
    }
    // If not in swap, allow showing (e.g., during delay/reload following swap)
    setGoldMagDelayOk(true);
  }, [currentPhase?.id, isDual]);

  // Detect wrap-around to mark completion of the first full cycle while playing
  useEffect(() => {
    const prev = prevNowRef.current;
    // when time wraps from near end back to start, now will be less than prev
    if (isPlaying && firstCycle && now < prev) {
      setFirstCycle(false);
    }
    prevNowRef.current = now;
  }, [now, isPlaying, firstCycle]);

  // Compute auto-reload gold-mag icon (dual auto mode only)
  let leftSubtitle: string | React.ReactNode | undefined;
  let rightSubtitle: string | React.ReactNode | undefined;
  if (isDual && autoDualReload) {
    const thresholdMs = 4600; // 4000 + 600 buffer

    const renderGoldMagBadge = (progress: number, active: boolean) => {
      if (!active) {
        return (
          <span className="relative inline-flex items-center justify-center rounded-md border border-white/10 bg-black/10 text-white/70 px-1.5 py-1 align-middle shadow-none">
            <Image
              src="/attachments/magazine/Extended_Light_Mag.svg"
              alt={t('attachments.mag.extendedLight')}
              width={12}
              height={12}
              className="invert"
            />
          </span>
        );
      }
      const clamped = Math.max(0, Math.min(1, progress));
      const maskHeightPct = (1 - clamped) * 100;
      return (
        <span className="relative inline-flex items-center justify-center rounded-md border border-amber-400/30 bg-amber-500/10 text-amber-200 px-1.5 py-1 overflow-hidden align-middle shadow-none">
          <span className="absolute inset-x-0 top-0 bg-black/30" style={{ height: `${maskHeightPct}%` }} />
          <Image
            src="/attachments/magazine/Extended_Light_Mag.svg"
            alt={t('attachments.mag.extendedLight')}
            width={12}
            height={12}
            className="invert relative z-10"
          />
        </span>
      );
    };

    // Find last swap in current cycle (raw) and global last swap (wrapped)
    let lastSwapIdxRaw = -1;
    for (let i = 0; i < timeline.phases.length; i++) {
      const p = timeline.phases[i];
      if (p.id === 'swap' && p.startTime <= now) lastSwapIdxRaw = i;
    }
    let lastSwapIdxWrapped = -1;
    for (let i = timeline.phases.length - 1; i >= 0; i--) {
      if (timeline.phases[i].id === 'swap') { lastSwapIdxWrapped = i; break; }
    }

    // Always show inactive badges by default
    leftSubtitle = renderGoldMagBadge(0, false);
    rightSubtitle = renderGoldMagBadge(0, false);

    // Suppress active state on very first cycle before the first swap, unless we just wrapped
    const hasWrappedThisRender = now < prevNowRef.current;
    const suppressBeforeFirstSwap = firstCycle && !hasWrappedThisRender && lastSwapIdxRaw === -1;
    if (!suppressBeforeFirstSwap && goldMagDelayOk) {
      const swapIdx = lastSwapIdxRaw >= 0 ? lastSwapIdxRaw : lastSwapIdxWrapped;
      if (swapIdx >= 0) {
        // Determine which side was just holstered by finding preceding pattern side
        let prevPatternSide: 'A' | 'B' | undefined;
        for (let j = swapIdx - 1; j >= 0; j--) {
          const q = timeline.phases[j];
          if (q.id === 'pattern' && q.side) { prevPatternSide = q.side; break; }
        }
        if (!prevPatternSide) {
          for (let j = timeline.phases.length - 1; j > swapIdx; j--) {
            const q = timeline.phases[j];
            if (q.id === 'pattern' && q.side) { prevPatternSide = q.side; break; }
          }
        }

        if (prevPatternSide) {
          const swapStart = timeline.phases[swapIdx].startTime;
          const elapsedSinceSwap = ((now - swapStart + totalMs) % totalMs);
          const remainingMs = Math.max(0, thresholdMs - elapsedSinceSwap);
          if (remainingMs > 0) {
            const progress = (thresholdMs - remainingMs) / thresholdMs;
            if (prevPatternSide === 'A') {
              leftSubtitle = renderGoldMagBadge(progress, true);
            }
            if (prevPatternSide === 'B') {
              rightSubtitle = renderGoldMagBadge(progress, true);
            }
          }
        }
      }
    }
  }

  const leftHeader = isDual
    ? { name: gunAName, image: gunAImage, emphasis: activeSide === 'A', side: 'left' as const, subtitle: leftSubtitle }
    : (headerSide === 'left' ? { name: gunAName, image: gunAImage, emphasis: true, side: 'left' as const } : undefined);

  const rightHeader = isDual
    ? { name: gunBName as string, image: gunBImage as string, emphasis: activeSide === 'B', side: 'right' as const, subtitle: rightSubtitle }
    : (headerSide === 'right' ? { name: gunAName, image: gunAImage, emphasis: true, side: 'right' as const } : undefined);

  const center = {
    title: centralTheme.title,
    badgeIconSrc: undefined,
    // badgeIconSrc: currentPhase?.id === 'reload' ? '/attachments/magazine/Extended_Light_Mag.svg' : undefined,
    badgeAlt: currentPhase?.id === 'reload' ? t('attachments.mag.extendedLight') : undefined,
    symbol: swapDisplay ? t("timer.phase.swap") : centralTheme.symbol,
    subtitle: swapDisplay
      ? (
          <span className={`mt-2 ${isCompact ? 'text-xs' : 'text-sm'} font-semibold ${centralTheme.subtitleColor} flex items-center justify-center gap-2`}>
            <span>{t('display.swapTo')}</span>
            <span className="inline-flex items-center gap-2">
              <span className="relative w-5 h-5 align-middle inline-block">
                <Image src={swapDisplay.target === 'B' ? (gunBImage as string) : gunAImage} alt={swapDisplay.target === 'B' ? (gunBName as string) : gunAName} fill className="object-contain invert drop-shadow" sizes="20px" />
              </span>
              <span>{swapDisplay.target === 'B' ? (gunBName as string) : gunAName}</span>
            </span>
          </span>
        )
      : centralTheme.subtitle,
    subtitleColor: centralTheme.subtitleColor,
  };

  const invertMode: 'selected' | 'unselected' = isDual ? 'unselected' : 'selected';

  const selection: CoreCentralOverlaySelection | undefined = onChangeSelectionMode
    ? {
        mode: selectionMode,
        onChange: onChangeSelectionMode,
        invertMode,
        a: { name: gunAName, image: gunAImage, enabled: true },
        b: { name: gunBName || 'B', image: gunBImage || '', enabled: !!(gunBName && gunBImage) },
        abEnabled: !!(gunBName && gunBImage),
      }
    : undefined;

  const overlay: CoreCentralOverlay = {
    show: isCompact,
    isPlaying,
    onTogglePlay,
    playLabel: t('display.play'),
    stopLabel: t('display.stop'),
    playTitle: t('display.play'),
    stopTitle: t('display.stop'),
    selection,
  };

  // Single-mode reload overlay over the progress bar
  let progressOverlay: React.ReactNode | undefined;
  if (!isDual && timeline?.phases?.length) {
    const endPhase = timeline.phases.find(p => p.id === 'end');
    if (endPhase) {
      const total = Math.max(1, totalDurationMs);
      const reloadMs = Math.max(0, reloadDurationMs ?? 0);
      if (reloadMs > 0) {
        // Position overlay relative to the cycle (not time), since it will
        // be rendered within the moving 300% container alongside segments.
        const endPhaseStartPct = ((endPhase.startTime / total) * 100) % 100;
        const reloadPct = Math.min(100, (reloadMs / total) * 100);
        const tailPct = Math.max(0, Math.min(reloadPct, 100 - endPhaseStartPct));
        const headPct = Math.max(0, Math.min(100, reloadPct - tailPct));
        const markerLeftPct = headPct > 0 ? headPct : (endPhaseStartPct + tailPct);

        progressOverlay = (
          <>
            {tailPct > 0 && (
              <div
                className="absolute top-0 bottom-0 z-10"
                title={t('timer.phase.end')}
                style={{
                  left: `${endPhaseStartPct}%`,
                  width: `${tailPct}%`,
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0, rgba(255,255,255,0.55) 6px, transparent 6px, transparent 12px)',
                  backgroundBlendMode: 'overlay',
                }}
              />
            )}
            {headPct > 0 && (
              <div
                className="absolute top-0 bottom-0 z-10"
                title={t('timer.phase.end')}
                style={{
                  left: `0%`,
                  width: `${headPct}%`,
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0, rgba(255,255,255,0.55) 6px, transparent 6px, transparent 12px)',
                  backgroundBlendMode: 'overlay',
                }}
              />
            )}
            {(headPct > 0 || tailPct > 0) && (
              <div className="pointer-events-none absolute z-20 top-0 bottom-0" style={{ left: `${markerLeftPct}%` }}>
                <div className="absolute -translate-x-1/2 top-0 bottom-0 w-[3px] bg-white rounded-full" />
              </div>
            )}
          </>
        );
      }
    }
  }

  if (isDual && manualDualReload && timeline?.phases?.length) {
    const total = Math.max(1, totalDurationMs);
    const overlays: React.ReactNode[] = [];
    for (let i = 0; i < timeline.phases.length; i++) {
      const p = timeline.phases[i];
      if (p.id !== 'reload') continue;
      // Find preceding pattern to determine which side just fired
      let prevPatternSide: 'A' | 'B' | undefined;
      for (let j = i - 1; j >= 0; j--) {
        const q = timeline.phases[j];
        if (q.id === 'pattern' && q.side) {
          prevPatternSide = q.side;
          break;
        }
      }
      const reloadMs = prevPatternSide === 'B'
        ? Math.max(0, reloadBDurationMs ?? 0)
        : Math.max(0, reloadADurationMs ?? 0);
      if (!reloadMs) continue;
      // Position overlay relative to the cycle (not time), since it will
      // be rendered within the moving 300% container alongside segments.
      const startPct = ((p.startTime / total) * 100) % 100;
      const reloadPct = Math.min(100, (reloadMs / total) * 100);
      const tailPct = Math.max(0, Math.min(reloadPct, 100 - startPct));
      const headPct = Math.max(0, Math.min(100, reloadPct - tailPct));
      const markerLeftPct = headPct > 0 ? headPct : (startPct + tailPct);

      overlays.push(
        <>
          {tailPct > 0 && (
            <div
              className="absolute top-0 bottom-0 z-10"
              title={t('timer.phase.end')}
              style={{
                left: `${startPct}%`,
                width: `${tailPct}%`,
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0, rgba(255,255,255,0.55) 6px, transparent 6px, transparent 12px)',
                backgroundBlendMode: 'overlay',
              }}
            />
          )}
          {headPct > 0 && (
            <div
              className="absolute top-0 bottom-0 z-10"
              title={t('timer.phase.end')}
              style={{
                left: `0%`,
                width: `${headPct}%`,
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0, rgba(255,255,255,0.55) 6px, transparent 6px, transparent 12px)',
                backgroundBlendMode: 'overlay',
              }}
            />
          )}
          {(headPct > 0 || tailPct > 0) && (
            <div className="pointer-events-none absolute z-20 top-0 bottom-0" style={{ left: `${markerLeftPct}%` }}>
              <div className="absolute -translate-x-1/2 top-0 bottom-0 w-[3px] bg-white rounded-full" />
            </div>
          )}
        </>
      );
    }
    if (overlays.length > 0) {
      progressOverlay = (
        <div className="contents">
          {progressOverlay}
          {overlays.map((node, idx) => (
            <div key={`dual-reload-${idx}`} className="contents">{node}</div>
          ))}
        </div>
      );
    }
  }

  return (
    <CoreCentral
      isCompact={isCompact}
      containerBg={centralTheme.containerBg}
      leftHeader={leftHeader}
      rightHeader={rightHeader}
      center={center}
      progress={{ totalDurationMs, currentTimeMs, segments }}
      progressOverlay={progressOverlay}
      overlay={overlay}
      rootRef={rootRef}
    />
  );
}


