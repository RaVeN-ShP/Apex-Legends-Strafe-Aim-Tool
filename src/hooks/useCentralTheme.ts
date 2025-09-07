import { Pattern, Timeline, PhaseId } from '@/types/gun';
import { getPhaseStyle, PatternTypeStyles } from '@/config/styles';
import { useI18n } from '@/i18n/I18nProvider';

export type CentralTheme = {
  title: string;
  subtitle: string;
  symbol: string;
  containerBg: string;
  movementDirection: 'left' | 'right' | null;
  subtitleColor: string;
};

export function useCentralTheme(args: {
  timeline: Timeline;
  pattern: Pattern[];
  currentTimeMs: number;
}): CentralTheme {
  const { timeline, pattern, currentTimeMs } = args;
  const { t } = useI18n();
  const totalMs = Math.max(1, timeline.totalDurationMs);
  const nowMs = ((currentTimeMs % totalMs) + totalMs) % totalMs;
  const active = timeline.phases.find(p => nowMs >= p.startTime && nowMs < p.endTime) || null;
  const phaseId: PhaseId = active?.id ?? 'start';
  const countdownNumber = phaseId === 'start' ? Math.max(0, 3 - Math.floor((nowMs - (active?.startTime ?? 0)) / 500)) : undefined;

  type PatternState = 'shoot' | 'left' | 'right' | 'idle';
  let state: PatternState = 'idle';
  if (active?.id === 'pattern') {
    const phaseStart = active.startTime;
    const rel = nowMs - phaseStart;
    if (rel >= 0) {
      let acc = 0;
      for (const step of pattern) {
        const start = acc;
        const end = acc + Math.max(0, step.duration);
        if (rel >= start && rel < end) {
          state = step.type === 'shoot' ? 'shoot' : step.direction;
          break;
        }
        acc = end;
      }
    }
  }

  const base = {
    title: t('timer.phase.start'),
    subtitle: '',
    symbol: '...',
    containerBg: 'from-white/10 to-transparent',
    movementDirection: null as 'left' | 'right' | null,
    subtitleColor: 'text-white/70',
  } as CentralTheme;

  if (phaseId === 'start') {
    const num = countdownNumber ?? 0;
    const phaseStyle = getPhaseStyle('start');
    return {
      ...base,
      title: t('timer.phase.start'),
      subtitle: ``,
      symbol: num.toString(),
      containerBg: phaseStyle.gradient ?? base.containerBg,
      subtitleColor: phaseStyle.subtitleColor ?? base.subtitleColor,
    };
  }

  if (phaseId === 'pattern') {
    if (state === 'shoot') {
      return {
        ...base,
        title: t('timer.phase.pattern'),
        subtitle: t('timer.subtitle.shoot'),
        symbol: PatternTypeStyles.shoot.centralSymbol ?? PatternTypeStyles.shoot.symbol,
        containerBg: 'from-purple-500/20 to-purple-500/5',
        subtitleColor: PatternTypeStyles.shoot.subtitleColor,
      };
    }
    if (state === 'left') {
      return {
        ...base,
        title: t('timer.phase.pattern'),
        subtitle: t('timer.subtitle.moveLeft'),
        symbol: PatternTypeStyles.direction.left.centralSymbol ?? PatternTypeStyles.direction.left.symbol,
        containerBg: PatternTypeStyles.direction.left.gradient,
        movementDirection: 'left',
        subtitleColor: PatternTypeStyles.direction.left.subtitleColor,
      };
    }
    if (state === 'right') {
      return {
        ...base,
        title: t('timer.phase.pattern'),
        subtitle: t('timer.subtitle.moveRight'),
        symbol: PatternTypeStyles.direction.right.centralSymbol ?? PatternTypeStyles.direction.right.symbol,
        containerBg: PatternTypeStyles.direction.right.gradient,
        movementDirection: 'right',
        subtitleColor: PatternTypeStyles.direction.right.subtitleColor,
      };
    }
    return {
      ...base,
      title: t('timer.phase.pattern'),
      subtitle: '',
      subtitleColor: getPhaseStyle('pattern').subtitleColor ?? base.subtitleColor,
    };
  }

  if (phaseId === 'end') {
    const phaseStyle = getPhaseStyle('end');
    return {
      ...base,
      title: t('timer.phase.end'),
      subtitle: '',
      symbol: '✔',
      containerBg: phaseStyle.gradient ?? base.containerBg,
      subtitleColor: phaseStyle.subtitleColor ?? base.subtitleColor,
    };
  }

  return base;
}


