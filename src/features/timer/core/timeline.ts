import { Timeline, Phase, Side } from '@/features/guns/types/gun';

export function getCurrentPhase(timeline: Timeline, tMs: number): Phase | null {
  const total = Math.max(1, timeline.totalDurationMs);
  const t = ((tMs % total) + total) % total;
  for (const p of timeline.phases) {
    if (t >= p.startTime && t < p.endTime) return p;
  }
  return null;
}

export function getActiveSide(timeline: Timeline, tMs: number): Side | null {
  const p = getCurrentPhase(timeline, tMs);
  return p?.side ?? null;
}

export function findNextStartSide(timeline: Timeline, afterMs: number): Side | null {
  if (timeline.phases.length === 0) return null;
  const total = timeline.totalDurationMs;
  const t = ((afterMs % total) + total) % total;
  // Find current index
  let startIdx = timeline.phases.findIndex(p => t >= p.startTime && t < p.endTime);
  if (startIdx < 0) startIdx = 0;
  const n = timeline.phases.length;
  for (let step = 1; step <= n; step++) {
    const p = timeline.phases[(startIdx + step) % n];
    if (p.id === 'start' && p.side) return p.side;
  }
  return null;
}


