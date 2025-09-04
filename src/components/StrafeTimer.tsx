'use client';

import { useState, useEffect, useRef } from 'react';
import { Gun, Phase, Timeline } from '@/types/gun';
import { buildTimeline, formatTime } from '@/utils/audio';
import { useI18n } from '@/i18n/I18nProvider';

interface StrafeTimerProps {
  gun: Gun;
  waitTimeSeconds: number;
  volume?: number;
}

export default function StrafeTimer({ gun, waitTimeSeconds, volume = 0.8 }: StrafeTimerProps) {
  const { t } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentDirection, setCurrentDirection] = useState<'left' | 'right' | null>(null);
  const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
  const [beatCount, setBeatCount] = useState(0);
  
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
    timeline.current = buildTimeline(gun, waitTimeSeconds);
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [gun, waitTimeSeconds]);

  // Stop autoplay when switching weapons
  useEffect(() => {
    if (isPlayingRef.current) {
      stopTimer();
    }
  }, [gun.id]);

  const ensureAudioNodes = () => {
    if (!audioContext.current) return;
    if (!oscillatorRef.current || !gainRef.current) {
      const osc = audioContext.current.createOscillator();
      const gain = audioContext.current.createGain();
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, audioContext.current.currentTime);
      osc.connect(gain);
      // iOS Safari requires a DynamicsCompressor for stable output in some cases
      try {
        const compressor = audioContext.current.createDynamicsCompressor();
        gain.connect(compressor);
        compressor.connect(audioContext.current.destination);
      } catch {
        gain.connect(audioContext.current.destination);
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
    direction: 'left' | 'right',
    phase: 'start' | 'pattern' | 'end'
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
    let frequency = 800;
    let duration = 0.2;
    let amplitude = 1.0 * volume;
    const attack = 0.005;
    if (phase === 'pattern') {
      frequency = direction === 'left' ? 400 : 800;
      duration = 0.15;
      amplitude = 1.0 * volume;
    } else if (phase === 'end') {
      frequency = 1500;
      duration = 1.0;
      amplitude = 1.0 * volume;
    }
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
            scheduleCueAt(cueTime, cue.direction, cue.phase);
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
        for (const step of gun.strafePattern) {
          if (withinPattern >= acc && withinPattern < acc + step.duration) {
            dir = step.direction;
            break;
          }
          acc += step.duration;
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
      if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(now + 0.02); } catch {}
        try { oscillatorRef.current.disconnect(); } catch {}
        oscillatorRef.current = null;
      }
      if (gainRef.current) {
        try { gainRef.current.disconnect(); } catch {}
        gainRef.current = null;
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
          subtitle: t('timer.phase.follow'),
          color: 'text-blue-600',
          direction: currentDirection === 'left' ? 'A ←' : currentDirection === 'right' ? '→ D' : '...'
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

  return (
    <div className="text-white">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-white/10 rounded-full h-2 border border-white/10">
          <div 
            className="bg-red-500 h-2 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/60 mt-1">
          <span>{(currentTime / 1000).toFixed(1)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
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
        style={{ minHeight: isPopped ? '120px' : '250px' }}
        ref={centralRef}
      >
        {/* Phase header */}
        <div className={`absolute left-3 font-semibold text-white/80 ${isPopped ? 'top-2 text-[10px]' : 'top-3 text-xs'}`}>
          {phaseDisplay.title}
        </div>
        <div className={`absolute right-3 text-white/60 ${isPopped ? 'top-2 text-[9px]' : 'top-3 text-[11px]'}`}>
          {phaseDisplay.subtitle}
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
      </div>

      {/* Controls */}
      <div className="flex gap-3 items-center">
        {!isPlaying ? (
          <button
            onClick={startTimer}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-md transition-colors"
          >
            {t('timer.start')}
          </button>
        ) : (
          <button
            onClick={stopTimer}
            className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 px-4 rounded-md transition-colors"
          >
            {t('timer.stop')}
          </button>
        )}

        {/* Popout / Return buttons */}
        {!isPopped ? (
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
                // Measure current size and request a smaller popout
                const rect = centralRef.current.getBoundingClientRect();
                const scale = 0.6; // shrink to 60% of on-page size
                const targetWidth = Math.max(240, Math.round(rect.width * scale));
                const targetHeight = Math.max(140, Math.round(rect.height * scale));
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
                pipWin.document.body.style.padding = '6px';
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
            className="flex-1 py-3 px-4 text-sm font-semibold rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white transition-colors"
            title="Pop out the display (Document Picture-in-Picture)"
          >
            {t('timer.popout')}
          </button>
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
            className="flex-1 py-3 px-4 text-sm font-semibold rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white transition-colors"
            title="Return the display to the page"
          >
            {t('timer.return')}
          </button>
        )}
      </div>
    </div>
  );
}
