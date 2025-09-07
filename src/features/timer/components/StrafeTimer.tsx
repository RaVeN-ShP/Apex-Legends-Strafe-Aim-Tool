'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Gun, Timeline, Pattern, AudioCue } from '@/features/guns/types/gun';
import { buildTimeline } from '@/features/timer/audio/audio';
import { AudioEngine } from '@/features/timer/audio/audioEngine';
import { useI18n } from '@/i18n/I18nProvider';
// import Image from 'next/image';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
 
import { DELAY_SLIDER_MAX_SECONDS, DELAY_SLIDER_STEP_SECONDS, RECOMMENDED_DELAY_SECONDS, DEFAULT_DELAY_SECONDS } from '@/config/constants';
import CentralDisplay from '@/features/timer/components/central/CentralDisplay';
import PopoutControls from '@/features/timer/components/popout/PopoutControls';
import { useCentralTheme } from '@/features/timer/hooks/useCentralTheme';

interface StrafeTimerProps {
  gun: Gun;
  pattern: Pattern[];
  volume: number;
  onVolumeChange: (v: number) => void;
  resetToken?: string | number; // when this changes, stop the timer
}

export default function StrafeTimer({ gun, pattern, volume = 0.8, onVolumeChange, resetToken }: StrafeTimerProps) {
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

  const timelineValue = useMemo(() => buildTimeline(pattern, gun, waitTimeSeconds), [gun, pattern, waitTimeSeconds]);

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
  }, [gun.id]);

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
        const audioElapsedSec = ctx.currentTime - baseAudioStartRef.current;
        const totalMs = Math.max(1, totalDuration);
        // cycle time in ms, normalized to [0, totalMs)
        elapsedMs = ((audioElapsedSec * 1000) % totalMs + totalMs) % totalMs;
      } else {
        // Fallback to wall clock if AudioContext not ready yet
        elapsedMs = ((elapsedMs % Math.max(1, totalDuration)) + Math.max(1, totalDuration)) % Math.max(1, totalDuration);
      }
      setCurrentTime(elapsedMs);
      
      // Continue UI updates
      animationFrame.current = requestAnimationFrame(animate);
 
      // AudioEngine manages scheduling; nothing to do here
    };
 
    animate();
  };

  const stopTimer = () => {
    setIsPlaying(false);
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

  const centralTheme = useCentralTheme({ timeline: timelineValue, pattern, currentTimeMs: currentTime });

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

      {/* Central Display */}
      <CentralDisplay
        title={centralTheme.title}
        subtitle={centralTheme.subtitle}
        symbol={centralTheme.symbol}
        containerBg={centralTheme.containerBg}
        subtitleColor={centralTheme.subtitleColor}
        gunName={gun.name}
        gunImage={gun.image}
        isCompact={isPopped}
        totalDurationMs={totalDuration}
        currentTimeMs={currentTime}
        pattern={pattern}
        waitTimeSeconds={waitTimeSeconds}
        reloadTimeSeconds={gun.reloadTimeSeconds}
        rootRef={centralRef}
      />



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
        <PopoutControls targetRef={centralRef} onStateChange={setIsPopped} />
      </div>

      {/* Inline settings below buttons */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
          <label className="flex items-center gap-1 text-[10px] tracking-wider text-white/60 mb-1 h-4">
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
                type="range"
                min="0"
                max={DELAY_SLIDER_MAX_SECONDS}
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
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[6px] h-3 bg-gray-600 rounded-full"
                  style={{ left: `${(RECOMMENDED_DELAY_SECONDS / DELAY_SLIDER_MAX_SECONDS) * 100}%` }}
                />
                {/* Default 1.5s marker (amber) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[4px] h-6 bg-amber-300 rounded-full"
                  style={{ left: `${(DEFAULT_DELAY_SECONDS / DELAY_SLIDER_MAX_SECONDS) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-semibold text-amber-300 min-w-[3rem] text-right">{waitTimeSeconds}s</span>
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
          <label className="flex items-center gap-1 text-[10px] tracking-wider text-white/60 mb-1 h-4">
            {t('settings.volume')}
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              {/* Custom solid track (bottom layer) */}
              <div className="absolute top-1 bottom-0 left-[7px] right-[7px] z-0 flex items-center">
                <div className="w-full h-2 bg-gray-600 rounded" />
              </div>
              <input
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
