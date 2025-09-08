// Removed Next.js Image import in favor of native img
import { Pattern } from '@/features/guns/types/gun';
import { getStepStyle } from '@/config/styles';

export type CentralDisplayProps = {
  title: string;
  subtitle: string;
  symbol: string;
  containerBg: string;
  // movementDirection is not used; remove to avoid lint errors and keep API minimal
  subtitleColor: string;
  gunName: string;
  gunImage: React.ComponentType<React.SVGProps<SVGSVGElement>> | string;
  isCompact: boolean;
  totalDurationMs: number;
  currentTimeMs: number;
  pattern: Pattern[];
  waitTimeSeconds: number;
  reloadTimeSeconds?: number;
  rootRef?: React.Ref<HTMLDivElement>;
};

export default function CentralDisplay(props: CentralDisplayProps) {
  const {
    title,
    subtitle,
    symbol,
    containerBg,
    subtitleColor,
    gunName,
    gunImage,
    isCompact,
    totalDurationMs,
    currentTimeMs,
    pattern,
    waitTimeSeconds,
    reloadTimeSeconds,
    rootRef,
  } = props;

  const totalMs = Math.max(1, totalDurationMs);
  const progressPct = ((currentTimeMs % totalMs) / totalMs) * 100;
  const anchorPct = 10;
  const containerOffsetPct = (100 - anchorPct) + progressPct;
  const elementTranslatePct = (containerOffsetPct % 100) / 3;
  const translateStyle = `translateX(-${elementTranslatePct.toFixed(2)}%)`;

  const segments: Array<{ color: string; duration: number; title: string; symbol?: string }>= [];
  for (let i = 0; i < 3; i++) segments.push({ color: 'bg-amber-500', duration: 500, title: 'Start' });
  for (const step of pattern) {
    const { barColor, symbol: sym, label } = getStepStyle(step);
    segments.push({ color: barColor, duration: step.duration, title: label, symbol: sym || undefined });
  }
  const reloadMs = Math.round(((reloadTimeSeconds ?? 1)) * 1000);
  const startDurationMs = 1500;
  const patternTotalMs = pattern.reduce((acc, s) => acc + s.duration, 0);
  const endPhaseMs = Math.max(0, reloadMs - startDurationMs + waitTimeSeconds * 1000);
  segments.push({ color: 'bg-green-600', duration: endPhaseMs, title: 'Reload+Wait' });

  // Pre-calculated percentages for hatch overlay
  const endPhaseStartMs = startDurationMs + patternTotalMs;
  const endPhaseStartPct = (endPhaseStartMs / totalMs) * 100;
  const reloadPct = (reloadMs / totalMs) * 100;
  const startPct = (startDurationMs / totalMs) * 100;
  const endPct = (endPhaseMs / totalMs) * 100;

  const renderCycle = (keyPrefix: string) => (
    <div key={`cycle-${keyPrefix}`} className="relative h-full flex" style={{ width: '100%' }}>
      {segments.map((s, idx) => (
        <div key={`${keyPrefix}-${idx}`} className={`${s.color} relative h-full`} style={{ width: `${(s.duration / totalMs) * 100}%` }} title={`${s.title} • ${s.duration}ms`}>
          {s.symbol && (
            <span className="absolute inset-0 grid place-items-center text-[9px] leading-none text-white/90">{s.symbol}</span>
          )}
        </div>
      ))}
      {(() => {
        const tailPct = Math.max(0, Math.min(reloadPct, endPct));
        const headPctRaw = Math.max(0, reloadPct - endPct);
        const headPct = Math.min(headPctRaw, startPct);
        return (
          <>
            {tailPct > 0 && (
              <div
                className="absolute top-0 bottom-0 z-10 cursor-help"
                title="reloading"
                style={{
                  left: `${endPhaseStartPct}%`,
                  width: `${tailPct}%`,
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0, rgba(255,255,255,0.55) 6px, transparent 6px, transparent 12px)',
                  backgroundBlendMode: 'overlay',
                }}
              />
            )}
            {headPct > 0 && (
              <div
                className="absolute top-0 bottom-0 z-10 cursor-help"
                title="reloading"
                style={{
                  left: `0%`,
                  width: `${headPct}%`,
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0, rgba(255,255,255,0.55) 6px, transparent 6px, transparent 12px)',
                  backgroundBlendMode: 'overlay',
                }}
              />
            )}
            {(() => {
              const markerLeftPct = headPct > 0 ? headPct : (endPhaseStartPct + tailPct);
              if ((headPct > 0) || (tailPct > 0)) {
                return (
                  <div className="pointer-events-none absolute z-20 top-0 bottom-0" style={{ left: `${markerLeftPct}%` }}>
                    <div className="absolute -translate-x-1/2 top-0 bottom-0 w-[3px] bg-white rounded-full" />
                  </div>
                );
              }
              return null;
            })()}
          </>
        );
      })()}
    </div>
  );

  return (
    <div
      className={`relative mb-4 rounded-lg border border-white/10 bg-gradient-to-br ${containerBg} min-w-0 overflow-hidden`}
      style={{ minHeight: isCompact ? '135px' : '250px' }}
      ref={rootRef}
    >
      <div className={`absolute left-3 font-semibold text-white/80 ${isCompact ? 'top-2 text-[10px]' : 'top-3 text-xs'}`}>{title}</div>
      <div className={`absolute right-3 flex items-center gap-2 ${isCompact ? 'top-2' : 'top-3'}`}>
        <span className={`${isCompact ? 'text-[9px]' : 'text-[11px]'} text-white/80 max-w-[25ch] truncate`} title={gunName}>{gunName}</span>
        <div className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'} relative opacity-80`}>
          {(() => {
              const Icon = gunImage;
              if (typeof Icon === 'string') {
                return <img src={Icon} alt={gunName} className="absolute inset-0 w-full h-full object-contain invert drop-shadow" />;
              }
              return <Icon className="absolute inset-0 w-full h-full object-contain invert drop-shadow" />;
            })()}
        </div>
      </div>

      <div className={`flex items-center justify-center h-full ${isCompact ? 'pt-8' : 'pt-20'}`}>
        <div className="text-center">
          <div className={`${isCompact ? 'text-[48px] md:text-[64px]' : 'text-[56px] md:text-[84px]'} font-extrabold leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]`}>{symbol}</div>
          {subtitle && (
            <div className={`mt-2 ${isCompact ? 'text-xs' : 'text-sm'} font-semibold ${subtitleColor}`}>{subtitle}</div>
          )}
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-2 px-3">
        <div className="relative">
          <div className="h-3 w-full rounded-md overflow-hidden bg-white/10 border border-white/10">
            <div className="h-full flex relative" style={{ width: '300%', transform: translateStyle, willChange: 'transform' }}>
              {renderCycle('prev')}
              {renderCycle('curr')}
              {renderCycle('next')}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[10%] -translate-x-1/2 -top-3 text-white/80 text-xs select-none">▼</div>
            <div className="absolute left-[10%] -translate-x-1/2 top-0 h-3 w-[2px] bg-white/80" />
          </div>
        </div>
      </div>
    </div>
  );
}


