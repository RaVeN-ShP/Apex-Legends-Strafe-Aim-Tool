import { Pattern } from '@/features/guns/types/gun';
import { getStepStyle, PatternTypeStyles } from '@/config/styles';

interface DualPatternVisualizerProps {
  patternA: Pattern[];
  patternB: Pattern[];
}

export default function DualPatternVisualizer({ patternA, patternB }: DualPatternVisualizerProps) {
  const reloadMs = 1500; // fixed 1.5s segment between A and B

  const totalA = patternA.reduce((acc, s) => acc + Math.max(0, s.duration), 0);
  const totalB = patternB.reduce((acc, s) => acc + Math.max(0, s.duration), 0);
  const total = Math.max(1, totalA + reloadMs + totalB);

  const widthPct = (ms: number) => (ms / total) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white/90 font-semibold tracking-wide">Pattern</div>
        <div className="text-xs text-white/60">{patternA.length + patternB.length} steps</div>
      </div>
      <div className="h-4 w-full rounded-md overflow-hidden bg-white/10 border border-white/10">
        <div className="flex h-full w-full">
          {/* A steps */}
          {patternA.map((step, idx) => {
            const dur = Math.max(0, step.duration);
            const { barColor, symbol } = getStepStyle(step);
            return (
              <div
                key={`A-${idx}`}
                className={`${barColor} relative h-full`}
                style={{ width: `${widthPct(dur)}%` }}
                title={`A • ${dur}ms`}
              >
                <span className="absolute inset-0 grid place-items-center text-[10px] text-white/90">{symbol}</span>
              </div>
            );
          })}

          {/* Reload hatched segment (no ms in label) */}
          <div
            className={`relative h-full ${'bg-green-700'}`}
            style={{
              width: `${widthPct(reloadMs)}%`,
              backgroundImage: `repeating-linear-gradient(45deg, rgba(16,185,129,0.15) 0, rgba(16,185,129,0.15) 6px, rgba(16,185,129,0.35) 6px, rgba(16,185,129,0.35) 12px)`,
            }}
          >
          </div>

          {/* B steps */}
          {patternB.map((step, idx) => {
            const dur = Math.max(0, step.duration);
            const { barColor, symbol } = getStepStyle(step);
            return (
              <div
                key={`B-${idx}`}
                className={`${barColor} relative h-full`}
                style={{ width: `${widthPct(dur)}%` }}
                title={`B • ${dur}ms`}
              >
                <span className="absolute inset-0 grid place-items-center text-[10px] text-white/90">{symbol}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Duration labels under segments (skip reload) */}
      <div className="mt-1 w-full">
        <div className="flex w-full">
          {patternA.map((step, idx) => (
            <div key={`durA-${idx}`} className="px-0.5 text-center" style={{ width: `${widthPct(Math.max(0, step.duration))}%` }}>
              <span className="block text-[10px] leading-tight text-white/70">{Math.max(0, step.duration)}ms</span>
            </div>
          ))}
          {/* No duration label for reload */}
          <div style={{ width: `${widthPct(reloadMs)}%` }} />
          {patternB.map((step, idx) => (
            <div key={`durB-${idx}`} className="px-0.5 text-center" style={{ width: `${widthPct(Math.max(0, step.duration))}%` }}>
              <span className="block text-[10px] leading-tight text-white/70">{Math.max(0, step.duration)}ms</span>
            </div>
          ))}
        </div>
      </div>

      {(() => {
        const hasLeft = patternA.concat(patternB).some(p => p.type === 'direction' && p.direction === 'left');
        const hasRight = patternA.concat(patternB).some(p => p.type === 'direction' && p.direction === 'right');
        const hasShoot = patternA.concat(patternB).some(p => p.type === 'shoot');
        if (!hasLeft && !hasRight && !hasShoot) return null;
        return (
          <div className="mt-2 text-[11px] text-white/60">
            {hasLeft && (
              <span className="inline-flex items-center mr-3"><span className={`inline-block w-3 h-3 ${PatternTypeStyles.direction.left.barColor} rounded-sm mr-1`} /> Left</span>
            )}
            {hasRight && (
              <span className="inline-flex items-center mr-3"><span className={`inline-block w-3 h-3 ${PatternTypeStyles.direction.right.barColor} rounded-sm mr-1`} /> Right</span>
            )}
            {hasShoot && (
              <span className="inline-flex items-center mr-3"><span className={`inline-block w-3 h-3 ${PatternTypeStyles.shoot.barColor} rounded-sm mr-1`} /> Shoot</span>
            )}
            <span className="inline-flex items-center"><span className="inline-block w-3 h-3 bg-green-600 rounded-sm mr-1" /> Switch</span>
          </div>
        );
      })()}
    </div>
  );
}


