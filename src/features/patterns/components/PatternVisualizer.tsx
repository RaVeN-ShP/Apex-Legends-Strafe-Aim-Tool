import { Gun, Pattern } from '@/features/guns/types/gun';
import { useI18n } from '@/i18n/I18nProvider';
import { getStepStyle, PatternTypeStyles } from '@/config/styles';

interface PatternVisualizerProps {
  gun: Gun;
  pattern: Pattern[];
}

// Simple visualizer: horizontal timeline with segments colored per direction
export default function PatternVisualizer({ pattern }: PatternVisualizerProps) {
  const { t } = useI18n();
  const total = pattern.reduce((acc, s) => acc + s.duration, 0);
  const hasShoot = pattern.some(p => p.type === 'shoot');
  const hasLeft = pattern.some(p => p.type === 'direction' && p.direction === 'left');
  const hasRight = pattern.some(p => p.type === 'direction' && p.direction === 'right');

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
      <div className="h-4 w-full rounded-md overflow-hidden bg-white/10 border border-white/10">
        <div className="flex h-full w-full">
          {pattern.map((step, idx) => {
            const dur = step.duration;
            const widthPct = (dur / total) * 100;
            const { barColor, symbol } = getStepStyle(step);
            const tLabel =
              step.type === 'shoot'
                ? t('custom.shoot')
                : step.direction === 'left'
                ? t('custom.left')
                : t('custom.right');
            return (
              <div
                key={idx}
                className={`${barColor} relative h-full`}
                style={{ width: `${widthPct}%` }}
                title={`${tLabel} • ${dur}${t('pattern.units.ms')}`}
              >
                {/* Direction chevrons */}
                <span className="absolute inset-0 grid place-items-center text-[10px] text-white/90">
                  {symbol}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {/* Legend moved to header; duration labels removed as requested */}
    </div>
  );
}
