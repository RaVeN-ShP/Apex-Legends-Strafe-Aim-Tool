import { Timeline } from '@/features/guns/types/gun';
import { Pattern } from '@/features/guns/types/gun';
import { getPhaseStyle, getStepStyle } from '@/config/styles';

export type UISegment = {
  duration: number;
  colorClass: string;
  textColor?: string;
  title: string;
  symbol?: string;
  icon?: 'goldMag';
};

export function timelineToSegments(timeline: Timeline, opts: { patternA?: Pattern[]; patternB?: Pattern[] }): UISegment[] {
  const segments: UISegment[] = [];
  const patA = opts.patternA ?? [];
  const patB = opts.patternB ?? [];

  for (const p of timeline.phases) {
    // Special handling for countdown: split start phase into 3 numeric segments (3, 2, 1)
    if (p.id === 'start') {
      const st = getPhaseStyle(p.id);
      const total = p.endTime - p.startTime;
      const unit = Math.max(0, Math.floor(total / 3));
      const remainder = Math.max(0, total - unit * 3);
      const durations = [unit, unit, unit + remainder];
      segments.push({ duration: durations[0], colorClass: st.barColor ?? 'bg-white/10', textColor: st.textColor ?? 'text-black', title: p.name || st.label, symbol: '3' });
      segments.push({ duration: durations[1], colorClass: st.barColor ?? 'bg-white/10', textColor: st.textColor ?? 'text-black', title: p.name || st.label, symbol: '2' });
      segments.push({ duration: durations[2], colorClass: st.barColor ?? 'bg-white/10', textColor: st.textColor ?? 'text-black', title: p.name || st.label, symbol: '1' });
      continue;
    }
    if (p.id === 'pattern' && p.side) {
      const pat = p.side === 'B' ? patB : patA;
      // If cues were generated per step, we may not have stepIndex. Split by time using original steps.
      // Fallback: use one block colored by generic pattern style.
      const total = p.endTime - p.startTime;
      let acc = 0;
      if (pat.length > 0) {
        for (const step of pat) {
          const dur = Math.max(0, step.duration);
          if (dur <= 0) continue;
          const style = getStepStyle(step);
          segments.push({ duration: dur, colorClass: style.barColor, title: `${p.side} ${style.label}`, symbol: style.symbol || undefined });
          acc += dur;
        }
        const remainder = Math.max(0, total - acc);
        if (remainder > 0) {
          const st = getPhaseStyle('pattern');
          segments.push({ duration: remainder, colorClass: st.barColor ?? 'bg-white/10', title: st.label, symbol: st.symbol });
        }
      } else {
        const st = getPhaseStyle('pattern');
        segments.push({ duration: total, colorClass: st.barColor ?? 'bg-white/10', title: st.label, symbol: st.symbol });
      }
    } else {
      const st = getPhaseStyle(p.id);
      segments.push({
        duration: p.endTime - p.startTime,
        colorClass: st.barColor ?? 'bg-white/10',
        title: p.name || st.label,
        symbol: st.symbol,
        icon: st.icon === 'goldMag' ? 'goldMag' : undefined,
      });
    }
  }
  return segments;
}


