import { RECOMMENDED_DELAY_SECONDS } from '@/config/constants';
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
  phases.push({ id: 'pattern', name: 'Pattern', startTime: patternStartTime, endTime: currentTime, cues: patternCues, side: 'A' });

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
  console.log('computeDualWaits', { reloadAms, reloadBms, userDelayMs, countdownMs, waitAB, waitBA });
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
 * Compute Swap/Delay/Reload buffer durations for dual auto-reload mode.
 *
 * Assumptions:
 * - Swap time is a fixed 500ms between weapons
 * - Countdown ("Start") is 1500ms and does not count toward holster time for the weapon being drawn
 * - A weapon must be holstered for at least 4.0s (+buffer) before being drawn to guarantee auto-reload
 * - The user-controlled delay is applied symmetrically in both directions (A→B and B→A)
 *
 * For B to be ready at Start(B): time since B was last used must be >= threshold.
 * This includes: Swap B→A + Delay B→A + Start A + Pattern A + Swap A→B + Delay A→B.
 *
 * Similarly for A to be ready at Start(A): Swap A→B + Delay A→B + Start B + Pattern B + Swap B→A + Delay B→A.
 */
export function computeAutoReloadPhaseDurations(
  patternTimeA: number,
  patternTimeB: number,
  userDelayMs: number,
  countdownMs: number = 1500, 
  swapMs: number = 500,
  thresholdMs: number = 4000 + 600,
): {
  swapAB: number;
  delayAB: number;
  bufferAB: number;
  swapBA: number;
  delayBA: number;
  bufferBA: number;
  thresholdMs: number;
} {
  const holsterToEndA = swapMs + countdownMs + Math.max(0, patternTimeB);
  const holsterToEndB = swapMs + countdownMs + Math.max(0, patternTimeA);
  const bufferAB = Math.max(0, thresholdMs - holsterToEndA);
  const bufferBA = Math.max(0, thresholdMs - holsterToEndB);

  // Treat provided userDelayMs as additional post-swap delay
  // It is added on top of the mandatory wait (reload buffer + countdown)
  const delayAB = Math.max(0, userDelayMs);
  const delayBA = Math.max(0, userDelayMs);
  return {
    swapAB: swapMs,
    delayAB,
    bufferAB,
    swapBA: swapMs,
    delayBA,
    bufferBA,
    thresholdMs,
  };
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
  const swapMs = 500;
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
    phases.push({ id: 'start', name: 'Start A', startTime: currentTime - countdownMs, endTime: currentTime, cues, side: 'A' });
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
    phases.push({ id: 'pattern', name: 'Pattern A', startTime: start, endTime: currentTime, cues, side: 'A' });
  }

  // A -> B: Swap (audio cue), then Reload wait (no audio)
  {
    // Swap
    {
      const start = currentTime;
      const cues: AudioCue[] = [];
      const safetyTailMs = 10;
      const maxLen = Math.max(0, (swapMs - safetyTailMs) / 1000);
      const len = Math.min(0.9, maxLen);
      if (len > 0) cues.push({ type: 'end', timestamp: currentTime, phase: 'swap', frequencyHz: 1500, lengthSec: len, amplitude: 1.0 });
      currentTime += swapMs;
      phases.push({ id: 'swap', name: 'Swap A→B', startTime: start, endTime: currentTime, cues });
    }
    // Reload wait after swap
    {
      const start = currentTime;
      const cues: AudioCue[] = [];
      currentTime += waitAB;
      phases.push({ id: 'reload', name: 'Reload A→B', startTime: start, endTime: currentTime, cues });
    }
  }

  // B: Start
  {
    const cues: AudioCue[] = [];
    for (let i = 0; i < 3; i++) {
      cues.push({ type: 'start', timestamp: currentTime, phase: 'start', frequencyHz: 500, lengthSec: 0.2, amplitude: 1.0 });
      currentTime += 500;
    }
    phases.push({ id: 'start', name: 'Start B', startTime: currentTime - countdownMs, endTime: currentTime, cues, side: 'B' });
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
    phases.push({ id: 'pattern', name: 'Pattern B', startTime: start, endTime: currentTime, cues, side: 'B' });
  }

  // B -> A: Swap (audio cue), then Reload wait (no audio)
  {
    // Swap
    {
      const start = currentTime;
      const cues: AudioCue[] = [];
      const safetyTailMs = 10;
      const maxLen = Math.max(0, (swapMs - safetyTailMs) / 1000);
      const len = Math.min(0.9, maxLen);
      if (len > 0) cues.push({ type: 'end', timestamp: currentTime, phase: 'swap', frequencyHz: 1500, lengthSec: len, amplitude: 1.0 });
      currentTime += swapMs;
      phases.push({ id: 'swap', name: 'Swap B→A', startTime: start, endTime: currentTime, cues });
    }
    // Reload wait after swap
    {
        const start = currentTime;
        const cues: AudioCue[] = [];
        currentTime += waitBA;
        phases.push({ id: 'reload', name: 'Reload B→A', startTime: start, endTime: currentTime, cues });
    }
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
  waitTimeSeconds: number,
): Timeline {
  const phases: Phase[] = [];
  let currentTime = 0;

  const countdownMs = 1500;
  const swapMs = 500;
  const userDelayMs = Math.round(Math.max(0, waitTimeSeconds) * 1000);

  // Calculate pattern durations
  const patternDur = (p: Pattern[]) => p.reduce((acc, s) => acc + Math.max(0, s.duration), 0);
  const patAms = patternDur(patternA);
  const patBms = patternDur(patternB);
  
  // Calculate Swap/Delay/Buffer durations for both directions
  const { swapAB, delayAB, bufferAB, swapBA, delayBA, bufferBA } = computeAutoReloadPhaseDurations(patAms, patBms, userDelayMs, countdownMs, swapMs);

  // A: Start
  {
    const cues: AudioCue[] = [];
    for (let i = 0; i < 3; i++) {
      cues.push({ type: 'start', timestamp: currentTime, phase: 'start', frequencyHz: 500, lengthSec: 0.2, amplitude: 1.0 });
      currentTime += 500;
    }
    phases.push({ id: 'start', name: 'Start A', startTime: currentTime - countdownMs, endTime: currentTime, cues, side: 'A' });
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
    phases.push({ id: 'pattern', name: 'Pattern A', startTime: start, endTime: currentTime, cues, side: 'A' });
  }

  // A -> B: Swap (audio cue), Delay (no audio), Reload buffer (no audio)
  {
    // Swap
    {
      const start = currentTime;
      const cues: AudioCue[] = [];
      cues.push({ type: 'end', timestamp: currentTime, phase: 'swap', frequencyHz: 1500, lengthSec: (swapAB + delayAB + bufferAB - 50) / 1000, amplitude: 1.0 });
      currentTime += swapAB;
      phases.push({ id: 'swap', name: 'Swap A→B', startTime: start, endTime: currentTime, cues });
    }
    // Delay (user-controlled)
    if (delayAB > 0) {
      const start = currentTime;
      const cues: AudioCue[] = [];
      currentTime += delayAB;
      phases.push({ id: 'delay', name: 'Delay A→B', startTime: start, endTime: currentTime, cues });
    }
    // Reload buffer (to guarantee B is ready)
    if (bufferAB > 0) {
      const start = currentTime;
      const cues: AudioCue[] = [];
      currentTime += bufferAB;
      phases.push({ id: 'reload', name: 'Reload buffer A→B', startTime: start, endTime: currentTime, cues });
    }
  }

  // B: Start
  {
    const cues: AudioCue[] = [];
    for (let i = 0; i < 3; i++) {
      cues.push({ type: 'start', timestamp: currentTime, phase: 'start', frequencyHz: 500, lengthSec: 0.2, amplitude: 1.0 });
      currentTime += 500;
    }
    phases.push({ id: 'start', name: 'Start B', startTime: currentTime - countdownMs, endTime: currentTime, cues, side: 'B' });
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
    phases.push({ id: 'pattern', name: 'Pattern B', startTime: start, endTime: currentTime, cues, side: 'B' });
  }

  // B -> A: Swap (audio cue), Delay (no audio), Reload buffer (no audio)
  {
    // Swap
    {
      const start = currentTime;
      const cues: AudioCue[] = [];
      cues.push({ type: 'end', timestamp: currentTime, phase: 'swap', frequencyHz: 1500, lengthSec: (swapBA + delayBA + bufferBA - 50) / 1000, amplitude: 1.0 });
      currentTime += swapBA;
      phases.push({ id: 'swap', name: 'Swap B→A', startTime: start, endTime: currentTime, cues });
    }
    // Delay (user-controlled)
    if (delayBA > 0) {
      const start = currentTime;
      const cues: AudioCue[] = [];
      currentTime += delayBA;
      phases.push({ id: 'delay', name: 'Delay B→A', startTime: start, endTime: currentTime, cues });
    }
    // Reload buffer (to guarantee A is ready)
    if (bufferBA > 0) {
      const start = currentTime;
      const cues: AudioCue[] = [];
      currentTime += bufferBA;
      phases.push({ id: 'reload', name: 'Reload buffer B→A', startTime: start, endTime: currentTime, cues });
    }
  }

  return { phases, totalDurationMs: currentTime };
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  return `${seconds}.${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Compare manual dual mode vs auto-reload dual mode for a given gun/pattern pair.
 * Returns the minimal (userDelay=0) cycle times for both modes and which is faster.
 *
 * Manual cycle model (consistent with buildDualTimeline):
 *   2*countdown + patternA + patternB + swapAB + waitAB + swapBA + waitBA
 *   where waitXY = max(0, reloadX - countdown) and swapAB = swapBA = swapMs
 *
 * Auto cycle model (consistent with buildAutoReloadDualTimeline):
 *   2*countdown + patternA + patternB + swapAB + swapBA + bufferAB + bufferBA
 */
export function compareDualModes(
  patternA: Pattern[],
  gunA: Gun,
  patternB: Pattern[],
  gunB: Gun,
  options?: { countdownMs?: number; swapMs?: number; thresholdMs?: number }
): {
  manualCycleMs: number;
  autoCycleMs: number;
  faster: 'manual' | 'auto' | 'equal';
  diffMs: number; // absolute difference between the faster and slower
} {
  const countdownMs = options?.countdownMs ?? 1500;
  const swapMs = options?.swapMs ?? 500;
  const thresholdMs = options?.thresholdMs ?? 4000 + 600; // 4.6s

  const sumPattern = (p: Pattern[]) => p.reduce((acc, s) => acc + Math.max(0, s.duration), 0);
  const patAms = sumPattern(patternA);
  const patBms = sumPattern(patternB);

  const reloadAms = Math.round((gunA.reloadTimeSeconds ?? 1) * 1000);
  const reloadBms = Math.round((gunB.reloadTimeSeconds ?? 1) * 1000);

  // Manual minimal inter-waits (userDelay=0) with explicit swaps
  const waitABManual = Math.max(0, reloadAms - countdownMs + RECOMMENDED_DELAY_SECONDS  *1000);
  const waitBAManual = Math.max(0, reloadBms - countdownMs + RECOMMENDED_DELAY_SECONDS  *1000);
  const manualCycleMs = countdownMs + patAms + swapMs + waitABManual + countdownMs + patBms + swapMs + waitBAManual;

  // Auto minimal inter-waits (userDelay=0), compute buffers using existing logic
  const { bufferAB, bufferBA } = computeAutoReloadPhaseDurations(
    patAms,
    patBms,
    0, // userDelayMs
    countdownMs,
    swapMs,
    thresholdMs,
  );
  const autoCycleMs = 2 * countdownMs + patAms + patBms + swapMs + swapMs + bufferAB + bufferBA;

  let faster: 'manual' | 'auto' | 'equal' = 'equal';
  let diffMs = 0;
  if (manualCycleMs < autoCycleMs) {
    faster = 'manual';
    diffMs = autoCycleMs - manualCycleMs;
  } else if (autoCycleMs < manualCycleMs) {
    faster = 'auto';
    diffMs = manualCycleMs - autoCycleMs;
  }

  return { manualCycleMs, autoCycleMs, faster, diffMs };
}
