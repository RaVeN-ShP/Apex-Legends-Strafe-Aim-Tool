'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Gun, Timeline, Pattern, AudioCue } from '@/features/guns/types/gun';
import { buildTimeline, buildDualTimeline } from '@/features/timer/audio/audio';
import { AudioEngine } from '@/features/timer/audio/audioEngine';
import { useI18n } from '@/i18n/I18nProvider';
// import Image from 'next/image';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
 
import { DELAY_SLIDER_MAX_SECONDS, DELAY_SLIDER_STEP_SECONDS, RECOMMENDED_DELAY_SECONDS, DEFAULT_DELAY_SECONDS } from '@/config/constants';
import CentralDisplay from '@/features/timer/components/central/CentralDisplay';
import DualCentralDisplay from '@/features/timer/components/central/DualCentralDisplay';
import PopoutControls from '@/features/timer/components/popout/PopoutControls';
import { useCentralTheme } from '@/features/timer/hooks/useCentralTheme';
import { useDualPlayback } from '@/features/timer/context/DualPlaybackContext';

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
}

export default function StrafeTimer({ gun, pattern, volume = 0.8, onVolumeChange, resetToken, dual = false, gunB, patternB, selectionMode, onChangeSelectionMode }: StrafeTimerProps) {
  const { t } = useI18n();
  const dualPlayback = (() => {
    try { return useDualPlayback(); } catch { return null; }
  })();
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

  // Slider range depends on mode: dual mode uses 1s-5s
  const waitMin = dual ? 1 : 0;
  const waitMax = dual ? 5 : DELAY_SLIDER_MAX_SECONDS;
  const sliderRange = Math.max(0.0001, waitMax - waitMin);
  const showRecommendedMarker = RECOMMENDED_DELAY_SECONDS >= waitMin && RECOMMENDED_DELAY_SECONDS <= waitMax;
  const showDefaultMarker = DEFAULT_DELAY_SECONDS >= waitMin && DEFAULT_DELAY_SECONDS <= waitMax;

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
      return buildDualTimeline(pattern, gun, patternB, gunB, waitTimeSeconds);
    }
    return buildTimeline(pattern, gun, waitTimeSeconds);
  }, [dual, gun, pattern, gunB, patternB, waitTimeSeconds]);

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

  // no-op; audio node graph is maintained by AudioEngine

  // Removed legacy playDirectionCue; live audio is scheduled via scheduleCueAt

  // Per-cue scheduling handled by AudioEngine

  // Scheduling windows are handled by AudioEngine

  const startTimer = async () => {
    setIsPlaying(true);
    dualPlayback?.setIsPlaying(true);
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

      // Determine active side during dual playback and publish to context
      if (dual && gunB && patternB && dualPlayback) {
        const totalMs = Math.max(1, totalDuration);
        const nowMs = ((elapsedMs % totalMs) + totalMs) % totalMs;
        const active = timeline.current.phases.find(p => nowMs >= p.startTime && nowMs < p.endTime) || null;
        if (active) {
          const name = active.name || '';
          const side: 'A' | 'B' | null = /Pattern A|Start A/.test(name) ? 'A' : (/Pattern B|Start B/.test(name) ? 'B' : null);
          dualPlayback.setActiveSide(side);
        }
      }
      
      // Continue UI updates
      animationFrame.current = requestAnimationFrame(animate);
 
      // AudioEngine manages scheduling; nothing to do here
    };
 
    animate();
  };

  const stopTimer = () => {
    setIsPlaying(false);
    dualPlayback?.setIsPlaying(false);
    dualPlayback?.setActiveSide(null);
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
    const totalMs = Math.max(1, totalDuration);
    const nowMs = ((currentTime % totalMs) + totalMs) % totalMs;
    const active = timelineValue.phases.find(p => nowMs >= p.startTime && nowMs < p.endTime) || null;
    if (active && /Pattern B/.test(active.name || '')) return patternB;
    return pattern;
  }, [dual, gunB, patternB, pattern, timelineValue, currentTime, totalDuration]);

  const centralTheme = useCentralTheme({ timeline: timelineValue, pattern: patternForTheme, currentTimeMs: currentTime });

  // Live volume updates via AudioEngine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setVolume(volume);
    }
  }, [volume]);

  return (
    <div className="text-white">
      <div className="mb-4">
        {isPopped && (
          <div className="mt-1 relative overflow-hidden rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-100 px-3 py-2 text-center text-[13px] md:text-sm font-medium">
            <span className="absolute left-0 top-0 h-full w-1 bg-amber-400/80" />
            {t('timer.popoutActive')}
          </div>
        )}
      </div>

      {/* Central Display - wrapped in a stable container so PiP target doesn't unmount on mode switch */}
      <div ref={centralRef}>
        {!dual || !gunB || !patternB ? (
          <CentralDisplay
            title={centralTheme.title}
            subtitle={centralTheme.subtitle}
            symbol={centralTheme.symbol}
            containerBg={centralTheme.containerBg}
            subtitleColor={centralTheme.subtitleColor}
            gunName={gun.name}
            gunImage={gun.image}
            gunBName={gunB?.name}
            isCompact={isPopped}
            isPlaying={isPlaying}
            onTogglePlay={() => {
              if (isPlaying) {
                stopTimer();
              } else {
                startTimer();
              }
            }}
            totalDurationMs={totalDuration}
            currentTimeMs={currentTime}
            pattern={pattern}
            waitTimeSeconds={waitTimeSeconds}
            reloadTimeSeconds={gun.reloadTimeSeconds}
            selectionMode={selectionMode}
            onChangeSelectionMode={onChangeSelectionMode}
          />
        ) : (
          // Dual central display
          <DualCentralDisplay
            title={centralTheme.title}
            subtitle={centralTheme.subtitle}
            symbol={centralTheme.symbol}
            containerBg={centralTheme.containerBg}
            subtitleColor={centralTheme.subtitleColor}
            gunAName={gun.name}
            gunAImage={gun.image}
            gunBName={gunB.name}
            gunBImage={gunB.image}
            isCompact={isPopped}
            isPlaying={isPlaying}
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
            waitTimeSeconds={waitTimeSeconds}
            reloadTimeSecondsA={gun.reloadTimeSeconds}
            reloadTimeSecondsB={gunB.reloadTimeSeconds}
            selectionMode={selectionMode}
            onChangeSelectionMode={onChangeSelectionMode}
          />
        )}
      </div>



      <div className="grid grid-cols-2 gap-3 items-stretch">
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

        {/* Popout / Return buttons */}
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
          onToggleMode={() => {
            if (!onChangeSelectionMode) return;
            const next = selectionMode === 'A' ? 'B' : (selectionMode === 'B' ? 'AB' : 'A');
            onChangeSelectionMode(next);
          }}
        />
      </div>

      {/* Inline settings below buttons */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
          <label htmlFor="waitTimeSeconds" className="flex items-center gap-1 text-[10px] tracking-wider text-white/60 mb-1 h-4">
            {t('settings.wait')}
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
                    {t('settings.waitInfo')}
                  </PopoverPanel>
                )}
              </div>
            </Popover>
          </label>
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
              {/* Markers overlay (account for 14px thumb: 7px inset on both sides) */}
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
            </div>
            <span className="text-sm font-semibold text-amber-300 min-w-[3rem] text-right">{waitTimeSeconds}s</span>
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
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
