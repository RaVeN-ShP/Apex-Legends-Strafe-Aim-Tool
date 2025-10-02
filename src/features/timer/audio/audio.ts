import { Gun, AudioCue, Phase, Timeline, Pattern } from '@/features/guns/types/gun';

export function buildTimeline(pattern: Pattern[], gun: Gun, waitTimeSeconds: number): Timeline {
  const phases: Phase[] = [];
  let currentTime = 0;

  // Start: 3 beats (500ms apart)
  const startCues: AudioCue[] = [];
  for (let i = 0; i < 3; i++) {
    startCues.push({ type: 'start', timestamp: currentTime, phase: 'start', frequencyHz: 500, lengthSec: 0.2, amplitude: 1.0 });
    currentTime += 500;
  }
  phases.push({ id: 'start', name: 'Start', startTime: 0, endTime: currentTime, cues: startCues });

  // Pattern: immediate after start
  const patternStartTime = currentTime;
  const patternCues: AudioCue[] = [];
  for (const step of pattern) {
    if (step.type === 'shoot') {
      patternCues.push({ type: 'shoot', timestamp: currentTime, phase: 'pattern', frequencyHz: 1500, lengthSec: 0.15, amplitude: 1.0 });
      currentTime += Math.max(0, step.duration);
    } else if (step.type === 'direction') {
      patternCues.push({ type: 'direction', direction: step.direction, timestamp: currentTime, phase: 'pattern', frequencyHz: step.direction === 'left' ? 400 : 800, lengthSec: 0.15, amplitude: 1.0 });
      currentTime += step.duration;
    }
  }
  phases.push({ id: 'pattern', name: 'Pattern', startTime: patternStartTime, endTime: currentTime, cues: patternCues });

  // End phase: duration = reload - 1.5s + user delay (clamped to 0)
  const endStartTime = currentTime;
  const reloadMs = Math.round((gun.reloadTimeSeconds ?? 1) * 1000);
  const countdownMs = 1500; // 1.5s countdown
  const userDelayMs = Math.round(waitTimeSeconds * 1000);
  const endPhaseMs = Math.max(0, reloadMs - countdownMs + userDelayMs);
  const endCues: AudioCue[] = [];
  if (endPhaseMs > 0) {
    // Shorten end cue length if end phase is short to avoid spillover
    const safetyTailMs = 10; // keep a tiny tail before phase end
    const maxCueLenSec = Math.max(0, (endPhaseMs - safetyTailMs) / 1000);
    const endCueLenSec = Math.min(0.9, maxCueLenSec);
    if (endCueLenSec > 0) {
      endCues.push({ type: 'end', direction: 'left', timestamp: currentTime, phase: 'end', frequencyHz: 1500, lengthSec: endCueLenSec, amplitude: 1.0 });
    }
  }
  currentTime += endPhaseMs;
  phases.push({ id: 'end', name: 'End', startTime: endStartTime, endTime: currentTime, cues: endCues });

  return { phases, totalDurationMs: currentTime };
}

/**
 * Compute dual-mode inter-waits from each weapon's reload and the user delay.
 * After A (A→B): waitAB = reloadA - 1.5s + userDelay
 * After B (B→A): waitBA = reloadB - 1.5s + userDelay
 */
export function computeDualWaits(
  reloadASec?: number,
  reloadBSec?: number,
  waitTimeSeconds: number = 0,
  countdownMs: number = 1500,
): { waitAB: number; waitBA: number; userDelayMs: number; countdownMs: number } {
  const reloadAms = Math.round((reloadASec ?? 1) * 1000);
  const reloadBms = Math.round((reloadBSec ?? 1) * 1000);
  const userDelayMs = Math.round(waitTimeSeconds * 1000);
  const waitAB = Math.max(0, reloadAms + userDelayMs - countdownMs);
  const waitBA = Math.max(0, reloadBms + userDelayMs - countdownMs);
  return { waitAB, waitBA, userDelayMs, countdownMs };
}

/**
 * Compute auto-reload timeline delays for dual mode.
 * 
 * Apex auto-reloads weapons after 4 seconds of being holstered.
 * The delay must ensure: patternTime + delay + 1.5s countdown > 4s
 * This means: delay > 4s - patternTime - 1.5s = 2.5s - patternTime
 * Minimum delay is always 0.5s.
 * 
 * @param patternTimeA - Duration of pattern A in milliseconds
 * @param patternTimeB - Duration of pattern B in milliseconds
 * @param countdownMs - Countdown duration in milliseconds (default 1500)
 * @param minDelayMs - Minimum delay in milliseconds (default 500)
 * @returns Object with calculated delays
 */
export function computeAutoReloadWaits(
  patternTimeA: number,
  patternTimeB: number,
  countdownMs: number = 1500,
  minDelayMs: number = 500,
): { waitAB: number; waitBA: number; autoReloadThresholdMs: number } {
  const autoReloadThresholdMs = 4000 + 600; // 4 seconds + 600ms buffer
  
  // Calculate required delay for A→B transition
  // delayAB > 4s - patternTimeA - 1.5s = 2.5s - patternTimeA
  const requiredDelayAB = autoReloadThresholdMs - patternTimeB - countdownMs;
  const waitAB = Math.max(minDelayMs, requiredDelayAB);
  
  // Calculate required delay for B→A transition  
  // delayBA > 4s - patternTimeB - 1.5s = 2.5s - patternTimeB
  const requiredDelayBA = autoReloadThresholdMs - patternTimeA - countdownMs;
  const waitBA = Math.max(minDelayMs, requiredDelayBA);
  
  return { waitAB, waitBA, autoReloadThresholdMs };
}

/**
 * Build a dual-weapon timeline that alternates A then B, inserting minimal inter-waits so that
 * each weapon auto-reloads while the other is firing plus during its own 1.5s pre-start countdown.
 *
 * Cycle layout:
 *   Start(A) → Pattern(A) → Inter-wait A→B → Start(B) → Pattern(B) → Inter-wait B→A
 */
export function buildDualTimeline(
  patternA: Pattern[],
  gunA: Gun,
  patternB: Pattern[],
  gunB: Gun,
  waitTimeSeconds: number,
): Timeline {
  const phases: Phase[] = [];
  let currentTime = 0;

  const countdownMs = 1500;
  const { waitAB, waitBA } = computeDualWaits(gunA.reloadTimeSeconds, gunB.reloadTimeSeconds, waitTimeSeconds, countdownMs);

  const patternDur = (p: Pattern[]) => p.reduce((acc, s) => acc + Math.max(0, s.duration), 0);
  const patAms = patternDur(patternA);
  const patBms = patternDur(patternB);

  // A: Start
  {
    const cues: AudioCue[] = [];
    for (let i = 0; i < 3; i++) {
      cues.push({ type: 'start', timestamp: currentTime, phase: 'start', frequencyHz: 500, lengthSec: 0.2, amplitude: 1.0 });
      currentTime += 500;
    }
    phases.push({ id: 'start', name: 'Start A', startTime: currentTime - countdownMs, endTime: currentTime, cues });
  }

  // A: Pattern
  {
    const start = currentTime;
    const cues: AudioCue[] = [];
    for (const step of patternA) {
      if (step.type === 'shoot') {
        cues.push({ type: 'shoot', timestamp: currentTime, phase: 'pattern', frequencyHz: 1500, lengthSec: 0.15, amplitude: 1.0 });
        currentTime += Math.max(0, step.duration);
      } else {
        cues.push({ type: 'direction', direction: step.direction, timestamp: currentTime, phase: 'pattern', frequencyHz: step.direction === 'left' ? 400 : 800, lengthSec: 0.15, amplitude: 1.0 });
        currentTime += step.duration;
      }
    }
    phases.push({ id: 'pattern', name: 'Pattern A', startTime: start, endTime: currentTime, cues });
  }

  // Inter-wait A -> B (after A reload buffer)
  {
    const start = currentTime;
    const cues: AudioCue[] = [];
    if (waitAB > 0) {
      const safetyTailMs = 10;
      const maxLen = Math.max(0, (waitAB - safetyTailMs) / 1000);
      const len = Math.min(0.9, maxLen);
      if (len > 0) cues.push({ type: 'end', timestamp: currentTime, phase: 'end', frequencyHz: 1500, lengthSec: len, amplitude: 1.0 });
    }
    currentTime += Math.max(0, waitAB);
    phases.push({ id: 'end', name: 'Wait A→B', startTime: start, endTime: currentTime, cues });
  }

  // B: Start
  {
    const cues: AudioCue[] = [];
    for (let i = 0; i < 3; i++) {
      cues.push({ type: 'start', timestamp: currentTime, phase: 'start', frequencyHz: 500, lengthSec: 0.2, amplitude: 1.0 });
      currentTime += 500;
    }
    phases.push({ id: 'start', name: 'Start B', startTime: currentTime - countdownMs, endTime: currentTime, cues });
  }

  // B: Pattern
  {
    const start = currentTime;
    const cues: AudioCue[] = [];
    for (const step of patternB) {
      if (step.type === 'shoot') {
        cues.push({ type: 'shoot', timestamp: currentTime, phase: 'pattern', frequencyHz: 1500, lengthSec: 0.15, amplitude: 1.0 });
        currentTime += Math.max(0, step.duration);
      } else {
        cues.push({ type: 'direction', direction: step.direction, timestamp: currentTime, phase: 'pattern', frequencyHz: step.direction === 'left' ? 400 : 800, lengthSec: 0.15, amplitude: 1.0 });
        currentTime += step.duration;
      }
    }
    phases.push({ id: 'pattern', name: 'Pattern B', startTime: start, endTime: currentTime, cues });
  }

  // Inter-wait B -> A (after B reload buffer)
  {
    const start = currentTime;
    const cues: AudioCue[] = [];
    if (waitBA > 0) {
      const safetyTailMs = 10;
      const maxLen = Math.max(0, (waitBA - safetyTailMs) / 1000);
      const len = Math.min(0.9, maxLen);
      if (len > 0) cues.push({ type: 'end', timestamp: currentTime, phase: 'end', frequencyHz: 1500, lengthSec: len, amplitude: 1.0 });
    }
    currentTime += Math.max(0, waitBA);
    phases.push({ id: 'end', name: 'Wait B→A', startTime: start, endTime: currentTime, cues });
  }

  return { phases, totalDurationMs: currentTime };
}

/**
 * Build a dual-weapon timeline using auto-reload timing.
 * 
 * This timeline ensures that weapons auto-reload after being holstered for 4 seconds.
 * The delay between weapons is calculated to ensure the holstered weapon has enough
 * time to auto-reload before being used again.
 * 
 * Cycle layout:
 *   Start(A) → Pattern(A) → Auto-reload delay A→B → Start(B) → Pattern(B) → Auto-reload delay B→A
 */
export function buildAutoReloadDualTimeline(
  patternA: Pattern[],
  gunA: Gun,
  patternB: Pattern[],
  gunB: Gun,
): Timeline {
  const phases: Phase[] = [];
  let currentTime = 0;

  const countdownMs = 1500;
  
  // Calculate pattern durations
  const patternDur = (p: Pattern[]) => p.reduce((acc, s) => acc + Math.max(0, s.duration), 0);
  const patAms = patternDur(patternA);
  const patBms = patternDur(patternB);
  
  // Calculate auto-reload delays
  const { waitAB, waitBA } = computeAutoReloadWaits(patAms, patBms, countdownMs);

  // A: Start
  {
    const cues: AudioCue[] = [];
    for (let i = 0; i < 3; i++) {
      cues.push({ type: 'start', timestamp: currentTime, phase: 'start', frequencyHz: 500, lengthSec: 0.2, amplitude: 1.0 });
      currentTime += 500;
    }
    phases.push({ id: 'start', name: 'Start A', startTime: currentTime - countdownMs, endTime: currentTime, cues });
  }

  // A: Pattern
  {
    const start = currentTime;
    const cues: AudioCue[] = [];
    for (const step of patternA) {
      if (step.type === 'shoot') {
        cues.push({ type: 'shoot', timestamp: currentTime, phase: 'pattern', frequencyHz: 1500, lengthSec: 0.15, amplitude: 1.0 });
        currentTime += Math.max(0, step.duration);
      } else {
        cues.push({ type: 'direction', direction: step.direction, timestamp: currentTime, phase: 'pattern', frequencyHz: step.direction === 'left' ? 400 : 800, lengthSec: 0.15, amplitude: 1.0 });
        currentTime += step.duration;
      }
    }
    phases.push({ id: 'pattern', name: 'Pattern A', startTime: start, endTime: currentTime, cues });
  }

  // Auto-reload delay A -> B
  {
    const start = currentTime;
    const cues: AudioCue[] = [];
    // Add a subtle cue at the end of the delay to indicate weapon swap
    const safetyTailMs = 10;
    const maxLen = Math.max(0, (waitAB - safetyTailMs) / 1000);
    const len = Math.min(0.9, maxLen);
    cues.push({ type: 'end', timestamp: currentTime, phase: 'end', frequencyHz: 1500, lengthSec: len, amplitude: 1.0 });    currentTime += waitAB;
    phases.push({ id: 'end', name: 'Auto-reload delay A→B', startTime: start, endTime: currentTime, cues });
  }

  // B: Start
  {
    const cues: AudioCue[] = [];
    for (let i = 0; i < 3; i++) {
      cues.push({ type: 'start', timestamp: currentTime, phase: 'start', frequencyHz: 500, lengthSec: 0.2, amplitude: 1.0 });
      currentTime += 500;
    }
    phases.push({ id: 'start', name: 'Start B', startTime: currentTime - countdownMs, endTime: currentTime, cues });
  }

  // B: Pattern
  {
    const start = currentTime;
    const cues: AudioCue[] = [];
    for (const step of patternB) {
      if (step.type === 'shoot') {
        cues.push({ type: 'shoot', timestamp: currentTime, phase: 'pattern', frequencyHz: 1500, lengthSec: 0.15, amplitude: 1.0 });
        currentTime += Math.max(0, step.duration);
      } else {
        cues.push({ type: 'direction', direction: step.direction, timestamp: currentTime, phase: 'pattern', frequencyHz: step.direction === 'left' ? 400 : 800, lengthSec: 0.15, amplitude: 1.0 });
        currentTime += step.duration;
      }
    }
    phases.push({ id: 'pattern', name: 'Pattern B', startTime: start, endTime: currentTime, cues });
  }

  // Auto-reload delay B -> A
  {
    const start = currentTime;
    const cues: AudioCue[] = [];
    // Add a subtle cue at the end of the delay to indicate weapon swap
    const safetyTailMs = 10;
    const maxLen = Math.max(0, (waitBA - safetyTailMs) / 1000);
    const len = Math.min(0.9, maxLen);
    cues.push({ type: 'end', timestamp: currentTime, phase: 'end', frequencyHz: 1500, lengthSec: len, amplitude: 1.0 });    currentTime += waitBA;
    phases.push({ id: 'end', name: 'Auto-reload delay B→A', startTime: start, endTime: currentTime, cues });
  }

  return { phases, totalDurationMs: currentTime };
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  return `${seconds}.${milliseconds.toString().padStart(3, '0')}`;
}
