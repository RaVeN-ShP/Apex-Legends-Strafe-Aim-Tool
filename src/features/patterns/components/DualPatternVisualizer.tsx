import { Pattern } from '@/features/guns/types/gun';
import { getStepStyle, PatternTypeStyles } from '@/config/styles';
import { useI18n } from '@/i18n/I18nProvider';

interface DualPatternVisualizerProps {
  patternA: Pattern[];
  patternB: Pattern[];
  activeSide?: 'A' | 'B' | null;
}

export default function DualPatternVisualizer({ patternA, patternB, activeSide }: DualPatternVisualizerProps) {
  const { t } = useI18n();
  const totalA = Math.max(0, patternA.reduce((acc, s) => acc + Math.max(0, s.duration), 0));
  const totalB = Math.max(0, patternB.reduce((acc, s) => acc + Math.max(0, s.duration), 0));
  const connectorPct = 4; // width percentage for middle green divider
  const halfPct = (100 - connectorPct) / 2;
  const countA = patternA.length;
  const countB = patternB.length;
  const widthPctWithinHalf = (dur: number, total: number, half: number, count: number) => {
    if (total > 0) return (dur / total) * half;
    return count > 0 ? half / count : 0;
  };
  const hasLeft = patternA.concat(patternB).some(p => p.type === 'direction' && p.direction === 'left');
  const hasRight = patternA.concat(patternB).some(p => p.type === 'direction' && p.direction === 'right');
  const hasShoot = patternA.concat(patternB).some(p => p.type === 'shoot');

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white/90 font-semibold tracking-wide">{t('main.pattern')}</div>
        <div className="text-xs text-white/60">
          {hasLeft && (
            <span className="inline-flex items-center mr-3"><span className={`inline-block w-3 h-3 ${PatternTypeStyles.direction.left.barColor} rounded-sm mr-1`} /> {t('pattern.legend.left')}</span>
          )}
          {hasRight && (
            <span className="inline-flex items-center mr-3"><span className={`inline-block w-3 h-3 ${PatternTypeStyles.direction.right.barColor} rounded-sm mr-1`} /> {t('pattern.legend.right')}</span>
          )}
          {hasShoot && (
            <span className="inline-flex items-center"><span className={`inline-block w-3 h-3 ${PatternTypeStyles.shoot.barColor} rounded-sm mr-1`} /> {t('pattern.legend.shoot')}</span>
          )}
        </div>
      </div>

      {/* Single continuous bar: Pattern A (left half) -> Connector -> Pattern B (right half) */}
      <div className="h-4 w-full rounded-md overflow-hidden bg-white/10 border border-white/10">
        <div className="flex h-full w-full">
          {patternA.map((step, idx) => {
            const dur = Math.max(0, step.duration);
            const { barColor, symbol } = getStepStyle(step);
            const tLabel =
              step.type === 'shoot'
                ? t('custom.shoot')
                : step.direction === 'left'
                ? t('custom.left')
                : t('custom.right');
            return (
              <div
                key={`A-${idx}`}
                className={`${barColor} relative h-full ${activeSide && activeSide !== 'A' ? 'opacity-40 grayscale' : ''}`}
                style={{ width: `${widthPctWithinHalf(dur, totalA, halfPct, countA)}%` }}
                title={`A • ${tLabel} • ${dur}${t('pattern.units.ms')}`}
              >
                <span className="absolute inset-0 grid place-items-center text-[10px] text-white/90">{symbol}</span>
              </div>
            );
          })}
          <div
            className="relative h-full bg-emerald-500/80 border border-emerald-400/60"
            style={{ width: `${connectorPct}%` }}
            title={`A→B • ${t('pattern.legend.shoot')}`}
          >
            <span className="absolute inset-0 grid place-items-center text-[10px] text-white/90">↔</span>
          </div>
          {patternB.map((step, idx) => {
            const dur = Math.max(0, step.duration);
            const { barColor, symbol } = getStepStyle(step);
            const tLabel =
              step.type === 'shoot'
                ? t('custom.shoot')
                : step.direction === 'left'
                ? t('custom.left')
                : t('custom.right');
            return (
              <div
                key={`B-${idx}`}
                className={`${barColor} relative h-full ${activeSide && activeSide !== 'B' ? 'opacity-40 grayscale' : ''}`}
                style={{ width: `${widthPctWithinHalf(dur, totalB, halfPct, countB)}%` }}
                title={`B • ${tLabel} • ${dur}${t('pattern.units.ms')}`}
              >
                <span className="absolute inset-0 grid place-items-center text-[10px] text-white/90">{symbol}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend moved to header; duration labels removed as requested */}
    </div>
  );
}



