'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Gun, Timeline, Pattern, AudioCue } from '@/features/guns/types/gun';
import { buildTimeline, buildDualTimeline, buildAutoReloadDualTimeline, computeAutoReloadPhaseDurations, compareDualModes, formatTime } from '@/features/timer/audio/audio';
import { AudioEngine } from '@/features/timer/audio/audioEngine';
import { useI18n } from '@/i18n/I18nProvider';
import { useHapticFeedback } from '@/shared/hooks/useHapticFeedback';
// import Image from 'next/image';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
 
import { DELAY_SLIDER_MAX_SECONDS, DELAY_SLIDER_STEP_SECONDS, RECOMMENDED_DELAY_SECONDS, DEFAULT_DELAY_SECONDS, ENABLE_AUTO_RELOAD_TIMELINE } from '@/config/constants';
import UnifiedCentralDisplay from '@/features/timer/components/central/UnifiedCentralDisplay';
import PopoutControls from '@/features/timer/components/popout/PopoutControls';
import { getCurrentPhase, getActiveSide } from '@/features/timer/core/timeline';
// Dual playback state is lifted to page-level and passed via props

interface StrafeTimerProps {
  gun: Gun;
  pattern: Pattern[];
  volume: number;
  onVolumeChange: (v: number) => void;
  resetToken?: string | number; // when this changes, stop the timer
  dual?: boolean;
  gunB?: Gun;
  patternB?: Pattern[];
  selectionMode?: 'A' | 'B' | 'AB';
  onChangeSelectionMode?: (mode: 'A' | 'B' | 'AB') => void;
  onPlayingChange?: (playing: boolean) => void;
  onActiveSideChange?: (side: 'A' | 'B' | null) => void;
  activeSide?: 'A' | 'B' | null;
  useAutoReloadTimeline?: boolean; // Use auto-reload timeline mode for dual mode
  onChangeAutoReloadTimeline?: (v: boolean) => void;
}

export default function StrafeTimer({ gun, pattern, volume = 0.8, onVolumeChange, resetToken, dual = false, gunB, patternB, selectionMode, onChangeSelectionMode, onPlayingChange, onActiveSideChange, activeSide, useAutoReloadTimeline = false, onChangeAutoReloadTimeline }: StrafeTimerProps) {
  const triggerHaptic = useHapticFeedback({ duration: 'medium' });
  const { t } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [waitTimeSeconds, setWaitTimeSeconds] = useState<number>(RECOMMENDED_DELAY_SECONDS);
  const [waitInfoOpen, setWaitInfoOpen] = useState<boolean>(false);

  const timeline = useRef<Timeline>({ phases: [], totalDurationMs: 0 });
  const startTime = useRef<number>(0);
  const animationFrame = useRef<number | undefined>(undefined);
  
  const isPlayingRef = useRef<boolean>(false);
  const engineRef = useRef<AudioEngine | null>(null);
  const baseAudioStartRef = useRef<number>(0);
  
  const centralRef = useRef<HTMLDivElement | null>(null);
  
  const [isPopped, setIsPopped] = useState(false);
  // Flattened, per-cycle list of audio cues (leading source of direction/shoot state)
  const audioCuesRef = useRef<AudioCue[]>([]);

  // Slider range depends on mode
  // In auto-reload dual mode the delay can be 0; otherwise dual uses 1s-5s
  const isAutoReloadMode = dual && ENABLE_AUTO_RELOAD_TIMELINE && useAutoReloadTimeline;
  const waitMin = isAutoReloadMode ? 0 : (dual ? 0 : 0);
  const waitMax = dual ? 5 : DELAY_SLIDER_MAX_SECONDS;
  const sliderRange = Math.max(0.0001, waitMax - waitMin);
  const showRecommendedMarker = RECOMMENDED_DELAY_SECONDS >= waitMin && RECOMMENDED_DELAY_SECONDS <= waitMax;
  const showDefaultMarker = DEFAULT_DELAY_SECONDS >= waitMin && DEFAULT_DELAY_SECONDS <= waitMax;

  // Tooltip key varies by mode
  const waitInfoKey = isAutoReloadMode
    ? 'settings.waitInfo.dualAuto'
    : (dual ? 'settings.waitInfo.dualManual' : 'settings.waitInfo.single');

  // Resume audio on tab visibility change if needed
  useEffect(() => {
    const onVisibility = () => {
      const ctx = engineRef.current?.ctx ?? null;
      if (document.visibilityState === 'visible' && isPlayingRef.current && ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const timelineValue = useMemo(() => {
    if (dual && gunB && patternB) {
      // Use auto-reload timeline if feature is enabled and prop is set
      if (ENABLE_AUTO_RELOAD_TIMELINE && useAutoReloadTimeline) {
        return buildAutoReloadDualTimeline(pattern, gun, patternB, gunB, waitTimeSeconds);
      }
      return buildDualTimeline(pattern, gun, patternB, gunB, waitTimeSeconds);
    }
    return buildTimeline(pattern, gun, waitTimeSeconds);
  }, [dual, gun, pattern, gunB, patternB, waitTimeSeconds, useAutoReloadTimeline]);

  // Compute dual-mode comparison (manual vs auto) for current selection
  const dualComparison = useMemo(() => {
    if (dual && gunB && patternB) {
      try {
        return compareDualModes(pattern, gun, patternB, gunB);
      } catch {
        return null;
      }
    }
    return null;
  }, [dual, gun, gunB, pattern, patternB]);

  const currentPhase = useMemo(() => getCurrentPhase(timelineValue, currentTime), [timelineValue, currentTime]);

  useEffect(() => {
    timeline.current = timelineValue;
    // Build a flattened, timestamp-sorted cue list for fast lookups
    try {
      const cues: AudioCue[] = [];
      for (const p of timelineValue.phases) {
        for (const c of p.cues) cues.push(c);
      }
      cues.sort((a, b) => a.timestamp - b.timestamp);
      audioCuesRef.current = cues;
    } catch {
      audioCuesRef.current = [];
    }
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [timelineValue]);

  // Stop autoplay when switching weapons
  useEffect(() => {
    if (isPlayingRef.current) {
      stopTimer();
    }
  }, [gun.id, gunB?.id, dual]);

  // Clamp wait time into current mode's range when mode changes
  useEffect(() => {
    setWaitTimeSeconds((prev) => {
      const clamped = Math.min(waitMax, Math.max(waitMin, prev));
      return clamped;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitMin, waitMax, dual]);

  // Stop when reset token changes (e.g., pattern edited)
  useEffect(() => {
    if (isPlayingRef.current) {
      stopTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken]);

  // Ensure audio and timers stop on unmount
  useEffect(() => {
    return () => {
      if (isPlayingRef.current) {
        try { stopTimer(); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTimer = async () => {
    triggerHaptic();
    setIsPlaying(true);
    onPlayingChange?.(true);
    isPlayingRef.current = true;
    setCurrentTime(0);

    startTime.current = Date.now();
    // reset of any previous UI markers handled by derived status
    // Use extracted AudioEngine for audio graph + scheduling
    const engine = new AudioEngine();
    engineRef.current = engine;
    await engine.resume();
    const startBase = engine.start(timelineValue, volume, 10);
    baseAudioStartRef.current = startBase;

 
    const animate = () => {
      if (!isPlayingRef.current) {
        return;
      }
      const totalDuration = timeline.current.totalDurationMs;
      const ctx = engineRef.current?.ctx ?? null;
      let elapsedMs = Date.now() - startTime.current;
      if (ctx && baseAudioStartRef.current > 0) {
       const totalMs = Math.max(1, totalDuration);
        const audioElapsedMs = Math.max(0, (ctx.currentTime - baseAudioStartRef.current) * 1000);
        elapsedMs = audioElapsedMs % totalMs;
      } else {
        // Fallback to wall clock if AudioContext not ready yet
        elapsedMs = ((elapsedMs % Math.max(1, totalDuration)) + Math.max(1, totalDuration)) % Math.max(1, totalDuration);
      }
      setCurrentTime(elapsedMs);

      // Determine active side during dual playback and publish upward
      if (dual && gunB && patternB && onActiveSideChange) {
        const totalMs = Math.max(1, totalDuration);
        const nowMs = ((elapsedMs % totalMs) + totalMs) % totalMs;
        const side = getActiveSide(timeline.current, nowMs);
        onActiveSideChange(side);
      }
      
      // Continue UI updates
      animationFrame.current = requestAnimationFrame(animate);
 
      // AudioEngine manages scheduling; nothing to do here
    };
 
    animate();
  };

  const stopTimer = () => {
    triggerHaptic();
    setIsPlaying(false);
    onPlayingChange?.(false);
    onActiveSideChange?.(null);
    isPlayingRef.current = false;
    setCurrentTime(0);

    // derived status handles cue transitions now
    // Stop audio via engine
    if (engineRef.current) engineRef.current.stop();
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
  };

  const totalDuration = timelineValue.totalDurationMs;

  // Choose the appropriate pattern for the central theme in dual mode
  const patternForTheme: Pattern[] = useMemo(() => {
    if (!dual || !gunB || !patternB) return pattern;
    const side = getActiveSide(timelineValue, currentTime);
    return side === 'B' ? patternB : pattern;
  }, [dual, gunB, patternB, pattern, timelineValue, currentTime]);


  // Live volume updates via AudioEngine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setVolume(volume);
    }
  }, [volume]);

  // Auto-reload mode uses additional post-swap delay; minimum is 0s

  // Reset delay to mode defaults whenever switching modes or toggling reload mode in dual
  useEffect(() => {
    setWaitTimeSeconds(() => {
      let next = RECOMMENDED_DELAY_SECONDS; // single default 0.5s
      if (dual) {
        next = isAutoReloadMode ? 0 : RECOMMENDED_DELAY_SECONDS; // dual auto: additional delay starts at 0s
      }
      const clamped = Math.min(waitMax, Math.max(waitMin, next));
      return clamped;
    });
    // Note: stopping is handled elsewhere on dual change; reload toggle button already stops if playing
  }, [dual, useAutoReloadTimeline]);

  // Also reset delay defaults when guns change to keep auto-reload min current
  useEffect(() => {
    setWaitTimeSeconds(() => {
      let next = RECOMMENDED_DELAY_SECONDS;
      if (dual) {
        next = isAutoReloadMode ? 0 : RECOMMENDED_DELAY_SECONDS;
      }
      const clamped = Math.min(waitMax, Math.max(waitMin, next));
      return clamped;
    });
  }, [gun.id, gunB?.id]);

  return (
    <div className="text-white">
      <div>
        {isPopped && (
          <div className="mb-4 mt-1 relative overflow-hidden rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-100 px-3 py-2 text-center text-[13px] md:text-sm font-medium">
            <span className="absolute left-0 top-0 h-full w-1 bg-amber-400/80" />
            {t('timer.popoutActive')}
          </div>
        )}
      </div>

      {/* Central Display - wrapped in a stable container so PiP target doesn't unmount on mode switch */}
      <div ref={centralRef}>
        <UnifiedCentralDisplay
          gunAName={gun.name}
          gunAImage={gun.image}
          gunBName={gunB?.name}
          gunBImage={gunB?.image}
          isCompact={isPopped}
          headerSide={selectionMode === 'B' ? 'right' : 'left'}
          isPlaying={isPlaying}
          selectionMode={selectionMode}
          onChangeSelectionMode={onChangeSelectionMode}
          onTogglePlay={() => {
            if (isPlaying) {
              stopTimer();
            } else {
              startTimer();
            }
          }}
          totalDurationMs={totalDuration}
          currentTimeMs={currentTime}
          patternA={pattern}
          patternB={patternB}
          timeline={timelineValue}
          currentPhase={currentPhase}
          activeSide={activeSide}
          reloadDurationMs={Math.round(Math.max(0, (gun.reloadTimeSeconds ?? 0) * 1000))}
          reloadADurationMs={Math.round(Math.max(0, (gun.reloadTimeSeconds ?? 0) * 1000))}
          reloadBDurationMs={Math.round(Math.max(0, (gunB?.reloadTimeSeconds ?? 0) * 1000))}
          manualDualReload={dual && !(ENABLE_AUTO_RELOAD_TIMELINE && useAutoReloadTimeline)}
          autoDualReload={dual && ENABLE_AUTO_RELOAD_TIMELINE && useAutoReloadTimeline}
        />
      </div>



      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
        {!isPlaying ? (
          <button
            onClick={startTimer}
            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 rounded-md transition-colors"
          >
            {t('timer.start')}
          </button>
        ) : (
          <button
            onClick={stopTimer}
            className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white font-semibold px-4 rounded-md transition-colors"
          >
            {t('timer.stop')}
          </button>
        )}

        {/* Popout / Return buttons - hidden on mobile */}
        <div className="hidden md:block">
          <PopoutControls
            targetRef={centralRef}
            onStateChange={setIsPopped}
            onTogglePlay={() => {
              if (isPlayingRef.current) {
                stopTimer();
              } else {
                startTimer();
              }
            }}
            onChangeSelectionMode={(mode) => {
              onChangeSelectionMode?.(mode);
            }}
          />
        </div>
      </div>

      {/* Inline settings below buttons */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
          <div className="flex items-center justify-between mb-1 h-4">
            <label htmlFor="waitTimeSeconds" className="flex items-center gap-1 text-[10px] tracking-wider text-white/60">
              {isAutoReloadMode ? t('settings.minPostSwap') : t('settings.wait')}
              <Popover className="relative inline-block align-middle">
                <div
                  className="inline-block ml-1"
                  onMouseEnter={() => setWaitInfoOpen(true)}
                  onMouseLeave={() => setWaitInfoOpen(false)}
                >
                  <PopoverButton className="text-white/50 hover:text-white/80 cursor-help inline-flex items-center">
                    <InformationCircleIcon className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
                  </PopoverButton>
                  {waitInfoOpen && (
                    <PopoverPanel static className="absolute left-0 mt-1 z-30 whitespace-nowrap rounded-md border border-white/10 bg-black px-2 py-1 text-[11px] text-white/80 shadow-lg">
                      {t(waitInfoKey)}
                    </PopoverPanel>
                  )}
                </div>
              </Popover>
            </label>
            {/* {ENABLE_AUTO_RELOAD_TIMELINE && dual && gunB && patternB && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-wider text-white/60 select-none">{t('settings.manualReload')}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!useAutoReloadTimeline}
                  onClick={() => {
                    const nextManual = !(!useAutoReloadTimeline);
                    onChangeAutoReloadTimeline?.(!nextManual);
                    if (isPlayingRef.current) {
                      stopTimer();
                    }
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${
                    !useAutoReloadTimeline ? 'bg-emerald-500/80 border-emerald-400/60' : 'bg-white/10 border-white/20'
                  }`}
                  aria-label={t('settings.toggleManualReload')}
                  title={t('settings.manualReload')}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      !useAutoReloadTimeline ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )} */}
          </div>
          {/* {dual && gunB && patternB && dualComparison && (
            <div className="mb-2 -mt-1 text-[11px] text-white/70 flex items-center justify-between">
              <div>
                <span className="text-white/60">Manual:</span> {formatTime(dualComparison.manualCycleMs)}s
                <span className="text-white/40"> • </span>
                <span className="text-white/60">Auto:</span> {formatTime(dualComparison.autoCycleMs)}s
              </div>
              <div className={`font-semibold ${dualComparison.faster === 'auto' ? 'text-emerald-300' : dualComparison.faster === 'manual' ? 'text-sky-300' : 'text-white/70'}`}>
                {dualComparison.faster === 'equal'
                  ? 'Equal'
                  : `Faster: ${dualComparison.faster === 'auto' ? 'Auto' : 'Manual'} by ${(dualComparison.diffMs / 1000).toFixed(2)}s`}
              </div>
            </div>
          )} */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              {/* Custom solid track (bottom layer) */}
              <div className="absolute top-1 bottom-0 left-[7px] right-[7px] z-0 flex items-center">
                <div className="w-full h-2 bg-gray-600 rounded" />
              </div>
              <input
                id="waitTimeSeconds"
                type="range"
                min={waitMin}
                max={waitMax}
                step={DELAY_SLIDER_STEP_SECONDS}
                value={waitTimeSeconds}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setWaitTimeSeconds(v);
                  if (isPlayingRef.current) {
                    stopTimer();
                  }
                }}
                className="uniform-slider relative z-20 w-full h-2 cursor-pointer appearance-none rounded outline-none"
              />
              {/* Auto-reload additional delay has no minimum dead-zone overlay */}
              {/* Markers overlay (account for 14px thumb: 7px inset on both sides) */}
              {!isAutoReloadMode && (
                <div className="pointer-events-none absolute top-1 bottom-0 z-10 left-[7px] right-[7px]">
                  {/* Recommended 0.5s marker (gray) */}
                  {showRecommendedMarker && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[6px] h-3 bg-gray-600 rounded-full"
                      style={{ left: `${((RECOMMENDED_DELAY_SECONDS - waitMin) / sliderRange) * 100}%` }}
                    />
                  )}
                  {/* Default 1.5s marker (amber) */}
                  {showDefaultMarker && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[4px] h-6 bg-amber-300 rounded-full"
                      style={{ left: `${((DEFAULT_DELAY_SECONDS - waitMin) / sliderRange) * 100}%` }}
                    />
                  )}
                </div>
              )}
            </div>
            <span className="text-sm font-semibold text-amber-300 min-w-[3rem] text-right">{waitTimeSeconds}s</span>
          </div>
        </div>
        {/* Volume slider - hidden on mobile */}
        <div className="hidden sm:block rounded-md border border-white/10 bg-white/5 px-3 py-2">
          <label htmlFor="volume" className="flex items-center gap-1 text-[10px] tracking-wider text-white/60 mb-1 h-4">
            {t('settings.volume')}
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              {/* Custom solid track (bottom layer) */}
              <div className="absolute top-1 bottom-0 left-[7px] right-[7px] z-0 flex items-center">
                <div className="w-full h-2 bg-gray-600 rounded" />
              </div>
              <input
                id="volume"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  onVolumeChange(v);
                }}
                className="uniform-slider relative z-20 w-full h-2 cursor-pointer appearance-none rounded bg-transparent outline-none"
              />
            </div>
            <span className="text-sm font-semibold text-amber-300 min-w-[3rem] text-right">{(volume * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
      {/* Slider styles are defined globally in globals.css to avoid initial flash */}
    </div>
  );
}
