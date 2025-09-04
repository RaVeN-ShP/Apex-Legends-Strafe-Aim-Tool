import { Gun } from '@/types/gun';
import { useI18n } from '@/i18n/I18nProvider';

interface PatternVisualizerProps {
  gun: Gun;
}

// Simple visualizer: horizontal timeline with segments colored per direction
export default function PatternVisualizer({ gun }: PatternVisualizerProps) {
  const { t } = useI18n();
  const total = gun.strafePattern.reduce((acc, s) => acc + s.duration, 0);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white/90 font-semibold tracking-wide">{t('main.pattern')}</div>
        <div className="text-xs text-white/60">{gun.strafePattern.length} {t('timer.info.stepsShort')}</div>
      </div>
      <div className="h-4 w-full rounded-md overflow-hidden bg-white/10 border border-white/10">
        <div className="flex h-full w-full">
          {gun.strafePattern.map((step, idx) => {
            const widthPct = (step.duration / total) * 100;
            const color = step.direction === 'left' ? 'bg-blue-500' : 'bg-rose-500';
            return (
              <div
                key={idx}
                className={`${color} relative h-full`}
                style={{ width: `${widthPct}%` }}
                title={`${step.direction.toUpperCase()} • ${step.duration}ms`}
              >
                {/* Direction chevrons */}
                <span className="absolute inset-0 grid place-items-center text-[10px] text-white/90">
                  {step.direction === 'left' ? '◄' : '►'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {/* Duration labels under each bar segment */}
      <div className="mt-1 w-full">
        <div className="flex w-full">
          {gun.strafePattern.map((step, idx) => {
            const widthPct = (step.duration / total) * 100;
            return (
              <div key={`dur-${idx}`} className="px-0.5 text-center" style={{ width: `${widthPct}%` }}>
                <span className="block text-[10px] leading-tight text-white/70">{step.duration}ms</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 text-[11px] text-white/60">
        <span className="inline-flex items-center mr-3"><span className="inline-block w-3 h-3 bg-blue-500 rounded-sm mr-1" /> Left (A)</span>
        <span className="inline-flex items-center"><span className="inline-block w-3 h-3 bg-rose-500 rounded-sm mr-1" /> Right (D)</span>
      </div>
    </div>
  );
}
