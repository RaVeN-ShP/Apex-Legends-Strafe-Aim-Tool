import Image from 'next/image';
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
  gunImage: string;
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
  const endPhaseMs = Math.max(0, reloadMs - 1500 + waitTimeSeconds * 1000);
  segments.push({ color: 'bg-green-600', duration: endPhaseMs, title: 'Reload+Wait' });

  const renderCycle = (keyPrefix: string) => (
    <>
      {segments.map((s, idx) => (
        <div key={`${keyPrefix}-${idx}`} className={`${s.color} relative h-full`} style={{ width: `${(s.duration / totalMs) * 100}%` }} title={`${s.title} • ${s.duration}ms`}>
          {s.symbol && (
            <span className="absolute inset-0 grid place-items-center text-[9px] leading-none text-white/90">{s.symbol}</span>
          )}
        </div>
      ))}
    </>
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
          <Image src={gunImage} alt={gunName} fill className="object-contain invert drop-shadow" sizes="20px" />
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
            <div className="h-full flex" style={{ width: '300%', transform: translateStyle, willChange: 'transform' }}>
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


