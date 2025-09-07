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

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white/90 font-semibold tracking-wide">{t('main.pattern')}</div>
        <div className="text-xs text-white/60">{pattern.length} {t('timer.info.stepsShort')}</div>
      </div>
      <div className="h-4 w-full rounded-md overflow-hidden bg-white/10 border border-white/10">
        <div className="flex h-full w-full">
          {pattern.map((step, idx) => {
            const dur = step.duration;
            const widthPct = (dur / total) * 100;
            const { barColor, symbol, label } = getStepStyle(step);
            return (
              <div
                key={idx}
                className={`${barColor} relative h-full`}
                style={{ width: `${widthPct}%` }}
                title={`${label.toUpperCase()} • ${dur}ms`}
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
      {/* Duration labels under each bar segment */}
      <div className="mt-1 w-full">
        <div className="flex w-full">
          {pattern.map((step, idx) => {
            const dur = step.duration;
            const widthPct = (dur / total) * 100;
            return (
              <div key={`dur-${idx}`} className="px-0.5 text-center" style={{ width: `${widthPct}%` }}>
                <span className="block text-[10px] leading-tight text-white/70">{dur}ms</span>
              </div>
            );
          })}
        </div>
      </div>
      {(() => {
        const hasShoot = pattern.some(p => p.type === 'shoot');
        const hasLeft = pattern.some(p => p.type === 'direction' && p.direction === 'left');
        const hasRight = pattern.some(p => p.type === 'direction' && p.direction === 'right');
        if (!hasShoot && !hasLeft && !hasRight) return null;
        return (
          <div className="mt-2 text-[11px] text-white/60">
            {hasLeft && (
              <span className="inline-flex items-center mr-3"><span className={`inline-block w-3 h-3 ${PatternTypeStyles.direction.left.barColor} rounded-sm mr-1`} /> Left (A)</span>
            )}
            {hasRight && (
              <span className="inline-flex items-center mr-3"><span className={`inline-block w-3 h-3 ${PatternTypeStyles.direction.right.barColor} rounded-sm mr-1`} /> Right (D)</span>
            )}
            {hasShoot && (
              <span className="inline-flex items-center mr-3"><span className={`inline-block w-3 h-3 ${PatternTypeStyles.shoot.barColor} rounded-sm mr-1`} /> Shoot</span>
            )}
          </div>
        );
      })()}
    </div>
  );
}
