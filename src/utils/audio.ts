import { Gun, AudioCue, Phase, Timeline, Pattern } from '@/types/gun';

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

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  return `${seconds}.${milliseconds.toString().padStart(3, '0')}`;
}
