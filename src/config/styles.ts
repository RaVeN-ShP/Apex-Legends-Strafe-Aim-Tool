import { Pattern, PhaseId } from '@/features/guns/types/gun';

export const PatternTypeStyles = {
  shoot: {
    barColor: 'bg-purple-500',
    symbol: '●',
    centralSymbol: '●',
    label: 'timer.subtitle.shoot',
    textColor: 'text-purple-500',
    subtitleColor: 'text-purple-200',
  },
  direction: {
    left: {
      barColor: 'bg-blue-500',
      symbol: '◄',
      centralSymbol: 'A ←',
      label: 'timer.subtitle.moveLeft',
      textColor: 'text-blue-200',
      subtitleColor: 'text-blue-200',
      gradient: 'from-blue-500/20 to-blue-500/5',
    },
    right: {
      barColor: 'bg-rose-500',
      symbol: '►',
      centralSymbol: '→ D',
      label: 'timer.subtitle.moveRight',
      textColor: 'text-rose-200',
      subtitleColor: 'text-rose-200',
      gradient: 'from-rose-500/20 to-rose-500/5',
    },
  },
} as const;

export const PhaseStyles: Record<PhaseId, { label: string; textColor?: string; barColor?: string; gradient?: string; subtitleColor?: string; symbol?: string; icon?: 'goldMag' | 'swap' | 'delay' | 'clock'; iconImage?: string }> = {
  start: { label: 'timer.phase.start', barColor: 'bg-amber-500', textColor: 'text-amber-800', gradient: 'from-amber-500/20 to-amber-500/5', subtitleColor: 'text-white/70', symbol: '', icon: 'clock' },
  pattern: { label: 'timer.phase.pattern', subtitleColor: 'text-white/70' },
  end: { label: 'timer.phase.end', barColor: 'bg-emerald-600', gradient: 'from-emerald-500/20 to-emerald-500/5', subtitleColor: 'text-emerald-200', symbol: "✔" },
  swap: { label: 'timer.phase.swap', barColor: 'bg-emerald-500', gradient: 'from-emerald-500/20 to-emerald-500/5', subtitleColor: 'text-emerald-200', symbol: '↔', icon: 'swap' },
  delay: { label: 'timer.phase.delay', barColor: 'bg-emerald-700', gradient: 'from-emerald-700/20 to-emerald-700/5', subtitleColor: 'text-emerald-200', symbol: '✔', icon: 'delay' },
  reload: { label: 'timer.phase.reloadBuffer', barColor: 'bg-emerald-600', gradient: 'from-emerald-600/20 to-emerald-600/5', subtitleColor: 'text-emerald-200', symbol: "✔" },
};

export function getStepStyle(step: Pattern): { barColor: string; symbol: string | null; label: string } {
  if (step.type === 'shoot') {
    return { barColor: PatternTypeStyles.shoot.barColor, symbol: PatternTypeStyles.shoot.symbol, label: PatternTypeStyles.shoot.label };
  }
  const d = step.direction === 'left' ? PatternTypeStyles.direction.left : PatternTypeStyles.direction.right;
  return { barColor: d.barColor, symbol: d.symbol, label: d.label };
}

export function getPhaseStyle(id: PhaseId): { label: string; textColor?: string; barColor?: string; gradient?: string; subtitleColor?: string; symbol?: string; icon?: 'goldMag' | 'swap' | 'delay' | 'clock'; iconImage?: string } {
  return PhaseStyles[id];
}

// UI Color Configuration
export const UIColors = {
  // Base colors
  background: {
    primary: 'bg-black/20',
    secondary: 'bg-white/5',
    hover: 'bg-black/30',
  },
  border: {
    primary: 'border-white/10',
    secondary: 'border-white/15',
  },
  text: {
    primary: 'text-white',
    secondary: 'text-white/90',
    tertiary: 'text-white/80',
    muted: 'text-white/70',
    disabled: 'text-white/60',
    subtle: 'text-white/50',
  },
  
  // Gun slot colors
  gunSlot: {
    a: {
      active: {
        border: 'border-red-600/60',
        background: 'bg-gradient-to-br from-red-600/20 to-red-600/5',
      },
      inactive: {
        border: 'border-red-600/10',
        background: 'bg-gradient-to-br from-red-700/10 to-red-700/5',
        content: 'opacity-25 filter saturate-[.5]',
      },
    },
    b: {
      active: {
        border: 'border-sky-600/60',
        background: 'bg-gradient-to-br from-sky-600/20 to-sky-600/5',
      },
      inactive: {
        border: 'border-sky-600/10',
        background: 'bg-gradient-to-br from-sky-800/10 to-sky-800/5',
        content: 'opacity-25 filter saturate-[.5]',
      },
    },
    dual: {
      border: 'border-emerald-500/40',
      background: 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5',
      contentInactive: 'opacity-40 filter saturate-50',
    },
  },
  
  // Dual mode toggle
  dualToggle: {
    active: {
      border: 'border-emerald-400/40',
      background: 'bg-emerald-500/10',
      hover: 'hover:bg-emerald-500/15',
      text: 'text-emerald-200',
    },
    inactive: {
      border: 'border-white/15',
      background: 'bg-black/20',
      hover: 'hover:bg-black/30',
      text: 'text-white/60',
    },
  },
  
  // Attachment badges
  attachment: {
    magazine: {
      border: 'border-amber-400/50',
      background: 'bg-amber-500/30',
      text: 'text-amber-200',
    },
    stock: {
      border: 'border-purple-400/50',
      background: 'bg-purple-500/30',
      text: 'text-purple-200',
    },
  },
  
  // Remarks/tags
  remarks: {
    border: 'border-purple-400/30',
    background: 'bg-purple-500/10',
    text: 'text-purple-200',
  },
  
  // Links
  link: {
    default: 'underline hover:text-white/80',
  },
} as const;


