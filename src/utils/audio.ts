import { Gun, AudioCue, Phase, Timeline } from '@/types/gun';

export function buildTimeline(gun: Gun, waitTimeSeconds: number): Timeline {
  const phases: Phase[] = [];
  let currentTime = 0;

  // Start: 3 beats (500ms apart)
  const startCues: AudioCue[] = [];
  for (let i = 0; i < 3; i++) {
    startCues.push({ direction: i % 2 === 0 ? 'left' : 'right', timestamp: currentTime, phase: 'start' });
    currentTime += 500;
  }
  phases.push({ id: 'start', name: 'Start', startTime: 0, endTime: currentTime, cues: startCues });

  // Pattern: immediate after start
  const patternStartTime = currentTime;
  const patternCues: AudioCue[] = [];
  for (const step of gun.strafePattern) {
    patternCues.push({ direction: step.direction, timestamp: currentTime, phase: 'pattern' });
    currentTime += step.duration;
  }
  phases.push({ id: 'pattern', name: 'Pattern', startTime: patternStartTime, endTime: currentTime, cues: patternCues });

  // End: single cue + reload + extra wait
  const endStartTime = currentTime;
  const endCues: AudioCue[] = [{ direction: 'left', timestamp: currentTime, phase: 'end' }];
  const reloadMs = Math.round((gun.reloadTimeSeconds ?? 1) * 1000);
  currentTime += reloadMs + waitTimeSeconds * 1000;
  phases.push({ id: 'end', name: 'End', startTime: endStartTime, endTime: currentTime, cues: endCues });

  return { phases, totalDurationMs: currentTime };
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  return `${seconds}.${milliseconds.toString().padStart(3, '0')}`;
}
