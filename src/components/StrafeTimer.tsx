'use client';

import { useState, useEffect, useRef } from 'react';
import { Gun, Phase, Timeline, Pattern, AudioCue } from '@/types/gun';
import { buildTimeline, formatTime } from '@/utils/audio';
import { useI18n } from '@/i18n/I18nProvider';
import Image from 'next/image';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { getStepStyle, getPhaseStyle } from '@/config/styles';
import { DELAY_SLIDER_MAX_SECONDS, DELAY_SLIDER_STEP_SECONDS, RECOMMENDED_DELAY_SECONDS, DEFAULT_DELAY_SECONDS } from '@/config/constants';

interface StrafeTimerProps {
  gun: Gun;
  pattern: Pattern[];
  volume?: number;
  resetToken?: string | number; // when this changes, stop the timer
}

export default function StrafeTimer({ gun, pattern, volume = 0.8, resetToken }: StrafeTimerProps) {
  const { t } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentDirection, setCurrentDirection] = useState<'left' | 'right' | null>(null);
  const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
  const [beatCount, setBeatCount] = useState(0);
  const [justShot, setJustShot] = useState<boolean>(false);
  const [waitTimeSeconds, setWaitTimeSeconds] = useState<number>(DEFAULT_DELAY_SECONDS);
  const [waitInfoOpen, setWaitInfoOpen] = useState<boolean>(false);

  const timeline = useRef<Timeline>({ phases: [], totalDurationMs: 0 });
  const startTime = useRef<number>(0);
  const animationFrame = useRef<number | undefined>(undefined);
  const audioContext = useRef<AudioContext | null>(null);
  const lastCueIndex = useRef<number>(-1);
  const currentPhaseIdRef = useRef<string | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const scheduledNodesRef = useRef<Array<{ osc: OscillatorNode; gain: GainNode }>>([]);
  const baseAudioStartRef = useRef<number>(0);
  const cyclesScheduledRef = useRef<number>(0);
  const schedulerIntervalRef = useRef<number | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const scheduledUntilSecRef = useRef<number>(0);
  const centralRef = useRef<HTMLDivElement | null>(null);
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const [isPopped, setIsPopped] = useState(false);

  // Resume audio on tab visibility change if needed
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && isPlayingRef.current && audioContext.current) {
        if (audioContext.current.state === 'suspended') {
          audioContext.current.resume().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    timeline.current = buildTimeline(pattern, gun, waitTimeSeconds);
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [gun, pattern, waitTimeSeconds]);

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

  const ensureAudioNodes = () => {
    if (!audioContext.current) return;
    // Create a master gain to allow real-time volume control
    if (!masterGainRef.current) {
      try {
        masterGainRef.current = audioContext.current.createGain();
        masterGainRef.current.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), audioContext.current.currentTime);
        masterGainRef.current.connect(audioContext.current.destination);
      } catch {}
    }
    if (!oscillatorRef.current || !gainRef.current) {
      const osc = audioContext.current.createOscillator();
      const gain = audioContext.current.createGain();
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, audioContext.current.currentTime);
      osc.connect(gain);
      // Route through master gain
      try {
        if (masterGainRef.current) {
          const compressor = audioContext.current.createDynamicsCompressor();
          gain.connect(compressor);
          compressor.connect(masterGainRef.current);
        } else {
          gain.connect(audioContext.current.destination);
        }
      } catch {
        if (masterGainRef.current) {
          gain.connect(masterGainRef.current);
        } else {
          gain.connect(audioContext.current.destination);
        }
      }
      const startAt = audioContext.current.currentTime + 0.01;
      osc.start(startAt);
      oscillatorRef.current = osc;
      gainRef.current = gain;
    }
  };

  const playDirectionCue = (direction: 'left' | 'right', phase: 'start' | 'pattern' | 'end') => {
    // No-op at runtime; live audio is scheduled ahead using scheduleCueAt
  };

  const scheduleCueAt = (
    when: number,
    cue: AudioCue
  ) => {
    if (!audioContext.current) return;
    ensureAudioNodes();
    if (!oscillatorRef.current || !gainRef.current) return;
    // Hard-cut any previous envelope just before this cue to avoid overlap/interference
    const epsilon = 0.0005; // 0.5 ms safety margin
    const cutTime = Math.max(0, when - epsilon);
    try {
      gainRef.current.gain.cancelScheduledValues(cutTime);
      gainRef.current.gain.setValueAtTime(0.0001, cutTime);
    } catch {}

    const frequency = cue.frequencyHz;
    const duration = cue.lengthSec;
    const amplitude = Math.max(0, Math.min(1, cue.amplitude ?? 1.0));
    const attack = 0.005;

    try {
      // Safari/iOS sometimes throws if setValueAtTime is scheduled in the past
      oscillatorRef.current.frequency.cancelScheduledValues(when);
      const ctxNow = (audioContext.current ? audioContext.current.currentTime : when);
      oscillatorRef.current.frequency.setValueAtTime(frequency, Math.max(when, ctxNow));
    } catch {
      oscillatorRef.current.frequency.setValueAtTime(frequency, when);
    }
    try {
      gainRef.current.gain.cancelScheduledValues(when);
      const ctxNow = (audioContext.current ? audioContext.current.currentTime : when);
      const startAt = Math.max(when, ctxNow);
      gainRef.current.gain.setValueAtTime(0.0001, startAt);
      gainRef.current.gain.linearRampToValueAtTime(amplitude, startAt + attack);
    } catch {
      gainRef.current.gain.setValueAtTime(amplitude, when + attack);
    }
    // Use exponential decay for smooth tail
    try {
      const ctxNow = (audioContext.current ? audioContext.current.currentTime : when);
      const startAt = Math.max(when, ctxNow);
      gainRef.current.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    } catch {}
  };

  const scheduleWindow = (fromSec: number, toSec: number) => {
    if (!audioContext.current || !timeline.current.phases.length) return;
    const totalDurationSec = Math.max(0.001, timeline.current.totalDurationMs / 1000);
    const startCycle = Math.max(0, Math.floor((fromSec - baseAudioStartRef.current) / totalDurationSec));
    const endCycle = Math.max(startCycle, Math.floor((toSec - baseAudioStartRef.current) / totalDurationSec));
    for (let cy = startCycle; cy <= endCycle; cy++) {
      const cycleStart = baseAudioStartRef.current + cy * totalDurationSec;
      for (const phase of timeline.current.phases) {
        for (const cue of phase.cues) {
          const cueTime = cycleStart + cue.timestamp / 1000;
          if (cueTime >= fromSec && cueTime < toSec) {
            console.log('scheduling cue', cue);
            scheduleCueAt(cueTime, cue);
          }
        }
      }
    }
    scheduledUntilSecRef.current = Math.max(scheduledUntilSecRef.current, toSec);
  };

  const startTimer = async () => {
    if (!audioContext.current) {
      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioContext.current = new Ctx();
    }
    // iOS Safari requires an explicit resume inside a user gesture
    try {
      const ctx = audioContext.current;
      if (ctx) {
        await ctx.resume();
      }
    } catch {}
    // iOS unlock: play a one-sample silent buffer to prime the audio graph
    try {
      const ctx = audioContext.current;
      if (ctx && ctx.state === 'running') {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        const when = ctx.currentTime + 0.001;
        src.start(when);
        src.stop(when + 0.001);
      }
    } catch {}
    
    setIsPlaying(true);
    isPlayingRef.current = true;
    setCurrentTime(0);
    setCurrentDirection(null);
    setCurrentPhase(timeline.current.phases[0] || null);
    currentPhaseIdRef.current = timeline.current.phases[0]?.id ?? null;
    setBeatCount(0);
    setJustShot(false);
    startTime.current = Date.now();
    lastCueIndex.current = -1;
    scheduledNodesRef.current.forEach(({ osc }) => {
      try { osc.stop(); } catch {}
    });
    scheduledNodesRef.current = [];
    const ctxNowForStart = audioContext.current;
    if (!ctxNowForStart) {
      // If context is unexpectedly unavailable, abort cleanly
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }
    const now = ctxNowForStart.currentTime;
    const headroom = 0.05;
    baseAudioStartRef.current = now + headroom;
    ensureAudioNodes();
    const totalDurationSec = Math.max(0.001, timeline.current.totalDurationMs / 1000);
    const horizonSec = 10; // keep the horizon modest to avoid browser overload
    scheduledUntilSecRef.current = baseAudioStartRef.current;
    scheduleWindow(baseAudioStartRef.current, baseAudioStartRef.current + horizonSec);

    // Background-safe scheduler top-up independent of RAF
    if (schedulerIntervalRef.current) {
      clearInterval(schedulerIntervalRef.current);
    }
    schedulerIntervalRef.current = window.setInterval(() => {
      if (!isPlayingRef.current || !audioContext.current) return;
      const nowSec = audioContext.current.currentTime;
      const targetSec = nowSec + horizonSec;
      if (scheduledUntilSecRef.current < targetSec) {
        scheduleWindow(scheduledUntilSecRef.current, targetSec);
      }
    }, 1000);
 
    const animate = () => {
      if (!isPlayingRef.current) {
        return;
      }
      const totalDuration = timeline.current.totalDurationMs;
      const ctx = audioContext.current;
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
 
      if (!timeline.current.phases.length) return;
 
      // Find current phase based on elapsed time
      const activePhase = timeline.current.phases.find(
        phase => elapsedMs >= phase.startTime && elapsedMs < phase.endTime
      );
 
      if (activePhase && activePhase.id !== currentPhaseIdRef.current) {
        setCurrentPhase(activePhase);
        currentPhaseIdRef.current = activePhase.id;
        lastCueIndex.current = -1;
        setJustShot(false);
      }
 
      // Update UI indicators deterministically from cycle time
      if (activePhase?.id === 'start') {
        const withinStart = elapsedMs - activePhase.startTime;
        const beatIndex = Math.max(0, Math.min(2, Math.floor(withinStart / 500)));
        setBeatCount(beatIndex); // getPhaseDisplay uses 3 - beatCount
        setCurrentDirection(null);
      } else if (activePhase?.id === 'pattern') {
        const withinPattern = elapsedMs - activePhase.startTime;
        let acc = 0;
        let dir: 'left' | 'right' | null = null;
        setJustShot(false);
        for (const step of pattern) {
          const stepDuration = step.duration;
          if (withinPattern >= acc && withinPattern < acc + stepDuration) {
            const isShoot = step.type === 'shoot';
            const stepDir = step.type === 'direction' ? step.direction : undefined;
            if (isShoot) {
              if (Math.abs(withinPattern - acc) < 16) {
                setJustShot(true);
                setTimeout(() => setJustShot(false), 120);
              }
            }
            dir = stepDir ?? dir;
            break;
          }
          acc += stepDuration;
        }
        setCurrentDirection(dir);
        setBeatCount(0);
      } else {
        setCurrentDirection(null);
        setBeatCount(0);
      }

      // Continue UI updates
      animationFrame.current = requestAnimationFrame(animate);
 
      // Optionally top-up scheduling if we're nearing the last scheduled cycle
      if (audioContext.current) {
        const nowSec = audioContext.current.currentTime;
        const horizonSec = 10;
        const targetSec = nowSec + horizonSec;
        if (scheduledUntilSecRef.current < targetSec && isPlayingRef.current) {
          scheduleWindow(scheduledUntilSecRef.current, targetSec);
        }
      }
    };
 
    animate();
  };

  const stopTimer = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentTime(0);
    setCurrentDirection(null);
    setCurrentPhase(null);
    currentPhaseIdRef.current = null;
    setBeatCount(0);
    lastCueIndex.current = -1;
    if (schedulerIntervalRef.current) {
      clearInterval(schedulerIntervalRef.current);
      schedulerIntervalRef.current = null;
    }
    // Immediately stop all scheduled audio
    if (audioContext.current) {
      const now = audioContext.current.currentTime;
      if (gainRef.current) {
        try {
          gainRef.current.gain.cancelScheduledValues(now);
          gainRef.current.gain.setTargetAtTime(0.0001, now, 0.01);
        } catch {}
      }
      if (masterGainRef.current) {
        try {
          masterGainRef.current.gain.cancelScheduledValues(now);
        } catch {}
      }
      if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(now + 0.02); } catch {}
        try { oscillatorRef.current.disconnect(); } catch {}
        oscillatorRef.current = null;
      }
      if (gainRef.current) {
        try { gainRef.current.disconnect(); } catch {}
        gainRef.current = null;
      }
      if (masterGainRef.current) {
        try { masterGainRef.current.disconnect(); } catch {}
        masterGainRef.current = null;
      }
    }
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
  };

  const totalDuration = timeline.current.totalDurationMs;
  const progress = (currentTime / totalDuration) * 100;

  const getPhaseDisplay = () => {
    if (!currentPhase) {
      return {
        title: t('timer.phase.start'),
        subtitle: t('timer.phase.follow'),
        color: 'text-gray-400',
        direction: '...'
      };
    }

    switch (currentPhase.id) {
      case 'start':
        const countdownNumber = 3 - beatCount;
        return {
          title: t('timer.phase.start'),
          subtitle: `Starting in ${countdownNumber}`,
          color: 'text-amber-600',
          direction: countdownNumber.toString()
        };
      case 'pattern':
        return {
          title: t('timer.phase.pattern'),
          subtitle: justShot ? 'Shoot' : t('timer.phase.follow'),
          color: justShot ? 'text-purple-500' : 'text-blue-600',
          direction: justShot ? '●' : currentDirection === 'left' ? 'A ←' : currentDirection === 'right' ? '→ D' : '...'
        };
      case 'end':
        return {
          title: t('timer.phase.end'),
          subtitle: t('timer.phase.prepare'),
          color: 'text-green-600',
          direction: '✔'
        };
      default:
        return {
          title: t('timer.phase.start'),
          subtitle: t('timer.phase.follow'),
          color: 'text-gray-400',
          direction: '...'
        };
    }
  };

  const phaseDisplay = getPhaseDisplay();

  // Live volume updates via master gain
  useEffect(() => {
    const ctx = audioContext.current;
    const mg = masterGainRef.current;
    if (ctx && mg) {
      try {
        mg.gain.cancelScheduledValues(ctx.currentTime);
        mg.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime, 0.01);
      } catch {
        try { mg.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime); } catch {}
      }
    }
  }, [volume]);

  return (
    <div className="text-white">
      {/* Progress Bar */}
      <div className="mb-4">
        {/* <div className="w-full bg-white/10 rounded-full h-2 border border-white/10">
          <div 
            className="bg-red-500 h-2 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/60 mt-1">
          <span>{(currentTime / 1000).toFixed(1)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div> */}
        {isPopped && (
          <div className="mt-1 relative overflow-hidden rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-100 px-3 py-2 text-center text-[13px] md:text-sm font-medium">
            <span className="absolute left-0 top-0 h-full w-1 bg-amber-400/80" />
            {t('timer.popoutActive')}
          </div>
        )}
      </div>

      {/* Large Central Display to utilize vertical space */}
      <div
        className={
          `relative mb-4 rounded-lg border border-white/10 bg-gradient-to-br ` +
          (currentPhase?.id === 'end'
            ? 'from-green-500/20 to-green-500/5'
            : currentDirection === 'left'
            ? 'from-blue-500/20 to-blue-500/5'
            : currentDirection === 'right'
            ? 'from-rose-500/20 to-rose-500/5'
            : 'from-white/10 to-transparent')
        }
        style={{ minHeight: isPopped ? '135px' : '250px' }}
        ref={centralRef}
      >
        {/* Phase header */}
        <div className={`absolute left-3 font-semibold text-white/80 ${isPopped ? 'top-2 text-[10px]' : 'top-3 text-xs'}`}>
          {phaseDisplay.title}
        </div>
        <div className={`absolute right-3 flex items-center gap-2 ${isPopped ? 'top-2' : 'top-3'}`}>
          <span className={`${isPopped ? 'text-[9px]' : 'text-[11px]'} text-white/80 max-w-[50vw] truncate`}>{gun.name}</span>
          <div className={`${isPopped ? 'w-4 h-4' : 'w-5 h-5'} relative opacity-80`}>
            <Image src={gun.image} alt={gun.name} fill className="object-contain invert drop-shadow" sizes="20px" />
          </div>
        </div>

        {/* Centered big indicator */}
        <div className={`flex items-center justify-center h-full ${isPopped ? 'pt-8' : 'pt-20'}`}
        >
          <div className="text-center">
            <div className={`${isPopped ? 'text-[48px] md:text-[64px]' : 'text-[56px] md:text-[84px]'} font-extrabold leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]`}>
              {phaseDisplay.direction}
            </div>
            {currentDirection && (
              <div className={`mt-2 ${isPopped ? 'text-xs' : 'text-sm'} font-semibold ${currentDirection === 'left' ? 'text-blue-200' : 'text-rose-200'}`}>
                {currentDirection === 'left' ? 'Move Left' : 'Move Right'}
              </div>
            )}
          </div>
        </div>

        {/* Sliding timeline bar at bottom (start → pattern → end), endless loop */}
        <div className="absolute left-0 right-0 bottom-2 px-3">
          {(() => {
            const totalMs = Math.max(1, totalDuration);
            const progressPct = ((currentTime % totalMs) / totalMs) * 100; // 0..100 within a cycle
            const anchorPct = 10; // cursor position from the left
            // We render three cycles (prev|curr|next) -> content width = 300% of container
            // Convert container offset (in %) to element offset by dividing by 3
            const containerOffsetPct = (100 - anchorPct) + progressPct; // prev cycle (100%) + progress - anchor
            const elementTranslatePct = (containerOffsetPct % 100) / 3; // percentage of 300%-width element
            const translateStyle = `translateX(-${elementTranslatePct.toFixed(2)}%)`;

            const segments: Array<{ color: string; duration: number; title: string; symbol?: string }> = [];
            // Start phase: 3 beats (500ms each)
            for (let i = 0; i < 3; i++) {
              segments.push({ color: 'bg-amber-500', duration: 500, title: 'Start' });
            }
            // Pattern steps with arrows
            for (const step of pattern) {
              const { barColor, symbol, label } = getStepStyle(step);
              const dur = step.duration;
              segments.push({
                color: barColor,
                duration: dur,
                title: label,
                symbol: symbol || undefined,
              });
            }
            // End phase: reload - countdown(1.5s) + user delay
            const reloadMs = Math.round(((gun.reloadTimeSeconds ?? 1)) * 1000);
            const endPhaseMs = Math.max(0, reloadMs - 1500 + waitTimeSeconds * 1000);
            segments.push({ color: 'bg-green-600', duration: endPhaseMs, title: 'Reload+Wait' });

            const renderCycle = (keyPrefix: string) => (
              <>
                {segments.map((s, idx) => (
                  <div
                    key={`${keyPrefix}-${idx}`}
                    className={`${s.color} relative h-full`}
                    style={{ width: `${(s.duration / totalMs) * 100}%` }}
                    title={`${s.title} • ${s.duration}ms`}
                  >
                    {s.symbol && (
                      <span className="absolute inset-0 grid place-items-center text-[9px] leading-none text-white/90">
                        {s.symbol}
                      </span>
                    )}
                  </div>
                ))}
              </>
            );

            return (
              <div className="relative">
                <div className="h-3 w-full rounded-md overflow-hidden bg-white/10 border border-white/10">
                  <div className="h-full flex" style={{ width: '300%', transform: translateStyle, willChange: 'transform' }}>
                    {renderCycle('prev')}
                    {renderCycle('curr')}
                    {renderCycle('next')}

                  </div>
                </div>
                {/* Now-pointer at 10% */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-[10%] -translate-x-1/2 -top-3 text-white/80 text-xs select-none">▼</div>
                  <div className="absolute left-[10%] -translate-x-1/2 top-0 h-3 w-[2px] bg-white/80" />
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Controls */}
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
        {!isPopped ? (
          <div className="relative group w-full">
            {/* Hover tooltip with image */}
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-30 w-72">
              <div className="rounded-md border border-white/15 bg-black/90 p-2 shadow-lg">
                <div className="text-[11px] text-white/80 mb-2">{t('timer.popoutHint')}</div>
                <div className="relative w-full h-52 overflow-hidden rounded">
                  <Image src="/overlay_example.png" alt="Overlay example" fill className="object-cover" />
                </div>
              </div>
            </div>
            <button
              onClick={async () => {
              try {
                type DocumentPictureInPicture = {
                  requestWindow: (options?: { initialAspectRatio?: number; width?: number; height?: number }) => Promise<Window>;
                };
                const winWithDPIP = window as Window & { documentPictureInPicture?: DocumentPictureInPicture };
                if (!winWithDPIP.documentPictureInPicture || !centralRef.current) {
                  alert('Popout not supported in this browser. Use latest Chrome/Edge.');
                  return;
                }
                // Request the smallest practical popout size (compact but not clipped)
                // Central display enforces a minHeight when popped; match that and a compact width
                const targetWidth = 300; // slightly larger for readability
                const targetHeight = 150; // slightly taller to avoid crowding
                const pipWin: Window = await winWithDPIP.documentPictureInPicture.requestWindow({ width: targetWidth, height: targetHeight });
                pipWindowRef.current = pipWin;
                // Copy same-origin styles
                Array.from(document.styleSheets).forEach((styleSheet) => {
                  if (styleSheet instanceof CSSStyleSheet) {
                    try {
                      const rules: CSSRuleList = styleSheet.cssRules;
                      const styleEl = pipWin.document.createElement('style');
                      let cssText = '';
                      for (let i = 0; i < rules.length; i++) {
                        cssText += rules[i].cssText;
                      }
                      styleEl.appendChild(pipWin.document.createTextNode(cssText));
                      pipWin.document.head.appendChild(styleEl);
                    } catch {
                      // Likely cross-origin or inaccessible; skip
                    }
                  }
                });
                pipWin.document.body.style.margin = '0';
                // Match app background gradient (from gray-900 via gray-800 to gray-900)
                const gradient = 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)';
                pipWin.document.documentElement.style.background = gradient;
                pipWin.document.body.style.background = gradient;
                pipWin.document.body.style.color = '#ffffff';
                // Disable scrollbars and ensure full-height
                pipWin.document.documentElement.style.overflow = 'hidden';
                pipWin.document.body.style.overflow = 'hidden';
                pipWin.document.documentElement.style.height = '100%';
                pipWin.document.body.style.height = '100%';
                pipWin.document.body.style.padding = '4px';
                // Insert placeholder and move node
                const originalNode = centralRef.current;
                const placeholder = document.createElement('div');
                placeholder.style.display = 'contents';
                placeholderRef.current = placeholder;
                originalNode.parentElement?.insertBefore(placeholder, originalNode);
                pipWin.document.body.appendChild(pipWin.document.adoptNode(originalNode));
                setIsPopped(true);
                pipWin.addEventListener('pagehide', () => {
                  try {
                    if (centralRef.current && placeholderRef.current) {
                      const back = document.adoptNode(centralRef.current);
                      placeholderRef.current.parentElement?.replaceChild(back, placeholderRef.current);
                      placeholderRef.current = null;
                    }
                  } finally {
                    setIsPopped(false);
                    pipWindowRef.current = null;
                  }
                });
              } catch (e) {
                console.error(e);
                alert('Failed to open popout.');
              }
            }}
              className="w-full h-12 px-4 text-sm font-semibold rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white transition-colors"
              title="Pop out the display (Document Picture-in-Picture)"
            >
              {t('timer.popout')}
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              try {
                if (pipWindowRef.current && !pipWindowRef.current.closed && centralRef.current && placeholderRef.current) {
                  const back = document.adoptNode(centralRef.current);
                  placeholderRef.current.parentElement?.replaceChild(back, placeholderRef.current);
                  placeholderRef.current = null;
                  pipWindowRef.current.close();
                  pipWindowRef.current = null;
                  setIsPopped(false);
                }
              } catch {}
            }}
            className="w-full h-12 px-4 text-sm font-semibold rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white transition-colors"
            title="Return the display to the page"
          >
            {t('timer.return')}
          </button>
        )}
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
                <PopoverButton className="text-white/50 hover:text-white/80 cursor-help">
                  <span className="text-[13px] md:text-[14px] leading-none">🛈</span>
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
              <input
                type="range"
                min="0"
                max={DELAY_SLIDER_MAX_SECONDS}
                step={DELAY_SLIDER_STEP_SECONDS}
                value={waitTimeSeconds}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setWaitTimeSeconds(v);
                  // update timeline immediately
                  timeline.current = buildTimeline(pattern, gun, v);
                  setCurrentPhase(null);
                  setBeatCount(0);
                  setCurrentDirection(null);
                  if (isPlayingRef.current) {
                    stopTimer();
                  }
                }}
                className="uniform-slider relative z-10 w-full h-2 cursor-pointer appearance-none rounded bg-white/10 outline-none"
              />
              {/* Markers overlay (account for 14px thumb: 7px inset on both sides) */}
              <div className="pointer-events-none absolute top-0 bottom-0 z-0 left-[7px] right-[7px]">
                {/* Recommended 0.5s marker (gray) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[3px] h-5 bg-gray-300/90 rounded-full"
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
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  try {
                    // Adjust in-place volume by updating gain envelope amplitude factor
                    // We do not store locally here; parent controls prop. Notify parent if available.
                    (window as any).__setVolume?.(v);
                  } catch {}
                }}
                className="uniform-slider relative z-10 w-full h-2 cursor-pointer appearance-none rounded bg-white/10 outline-none"
              />
            </div>
            <span className="text-sm font-semibold text-amber-300 min-w-[3rem] text-right">{(volume * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
      {/* Ensure both sliders look consistent across browsers */}
      <style jsx global>{`
        input.uniform-slider { -webkit-appearance: none; appearance: none; background: rgba(255,255,255,0.1); }
        input.uniform-slider::-webkit-slider-runnable-track { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; }
        input.uniform-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; background: #111827; border: 1px solid rgba(255,255,255,0.2); border-radius: 9999px; margin-top: -3px; }
        input.uniform-slider::-moz-range-track { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; }
        input.uniform-slider::-moz-range-thumb { width: 14px; height: 14px; background: #111827; border: 1px solid rgba(255,255,255,0.2); border-radius: 9999px; }
      `}</style>
    </div>
  );
}
