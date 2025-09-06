import { Pattern, PhaseId } from '@/types/gun';

export const PatternTypeStyles = {
  shoot: {
    barColor: 'bg-purple-500',
    symbol: '●',
    label: 'Shoot',
    textColor: 'text-purple-500',
  },
  direction: {
    left: {
      barColor: 'bg-blue-500',
      symbol: '◄',
      label: 'Left',
      textColor: 'text-blue-200',
      gradient: 'from-blue-500/20 to-blue-500/5',
    },
    right: {
      barColor: 'bg-rose-500',
      symbol: '►',
      label: 'Right',
      textColor: 'text-rose-200',
      gradient: 'from-rose-500/20 to-rose-500/5',
    },
  },
} as const;

export const PhaseStyles: Record<PhaseId, { label: string; barColor?: string; gradient?: string }> = {
  start: { label: 'Start', barColor: 'bg-amber-500', gradient: 'from-amber-500/20 to-amber-500/5' },
  pattern: { label: 'Pattern' },
  end: { label: 'Reload+Wait', barColor: 'bg-green-600', gradient: 'from-green-500/20 to-green-500/5' },
};

export function getStepStyle(step: Pattern): { barColor: string; symbol: string | null; label: string } {
  if (step.type === 'shoot') {
    return { barColor: PatternTypeStyles.shoot.barColor, symbol: PatternTypeStyles.shoot.symbol, label: PatternTypeStyles.shoot.label };
  }
  const d = step.direction === 'left' ? PatternTypeStyles.direction.left : PatternTypeStyles.direction.right;
  return { barColor: d.barColor, symbol: d.symbol, label: d.label };
}

export function getPhaseStyle(id: PhaseId): { label: string; barColor?: string; gradient?: string } {
  return PhaseStyles[id];
}


