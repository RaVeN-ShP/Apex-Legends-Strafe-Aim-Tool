import Image from 'next/image';
import { Pattern } from '@/features/guns/types/gun';
import { getStepStyle } from '@/config/styles';

export type DualCentralDisplayProps = {
  title: string;
  subtitle: string;
  symbol: string;
  containerBg: string;
  subtitleColor: string;
  gunAName: string;
  gunAImage: string;
  gunBName: string;
  gunBImage: string;
  isCompact: boolean;
  totalDurationMs: number;
  currentTimeMs: number;
  patternA: Pattern[];
  patternB: Pattern[];
  waitTimeSeconds: number;
  reloadTimeSecondsA?: number;
  reloadTimeSecondsB?: number;
  rootRef?: React.Ref<HTMLDivElement>;
};

export default function DualCentralDisplay(props: DualCentralDisplayProps) {
  const {
    title,
    subtitle,
    symbol,
    containerBg,
    subtitleColor,
    gunAName,
    gunAImage,
    gunBName,
    gunBImage,
    isCompact,
    totalDurationMs,
    currentTimeMs,
    patternA,
    patternB,
    waitTimeSeconds,
    reloadTimeSecondsA,
    reloadTimeSecondsB,
    rootRef,
  } = props;

  const totalMs = Math.max(1, totalDurationMs);
  const progressPct = ((currentTimeMs % totalMs) / totalMs) * 100;
  const anchorPct = 10;
  const containerOffsetPct = (100 - anchorPct) + progressPct;
  const elementTranslatePct = (containerOffsetPct % 100) / 3;
  const translateStyle = `translateX(-${elementTranslatePct.toFixed(2)}%)`;

  const countdownMs = 1500;
  const patAms = patternA.reduce((acc, s) => acc + Math.max(0, s.duration), 0);
  const patBms = patternB.reduce((acc, s) => acc + Math.max(0, s.duration), 0);
  // In dual mode, ignore individual reload times. Always use fixed 1.0s.
  const reloadA = 1000;
  const reloadB = 1000;
  const userDelayMs = Math.round(waitTimeSeconds * 1000);

  // Dual-mode policy: ensure post-reload user delay independent of pattern length
  // We want: wait + countdownMs = 1000 + userDelayMs
  const waitAB = Math.max(0, reloadB + userDelayMs - countdownMs);
  const waitBA = Math.max(0, reloadA + userDelayMs - countdownMs);

  type Seg = { color: string; duration: number; title: string; symbol?: string };
  const segments: Seg[] = [];
  for (let i = 0; i < 3; i++) segments.push({ color: 'bg-amber-500', duration: 500, title: 'Start A' });
  for (const step of patternA) {
    const { barColor, symbol: sym, label } = getStepStyle(step);
    segments.push({ color: barColor, duration: step.duration, title: `A ${label}`, symbol: sym || undefined });
  }
  if (waitAB > 0) segments.push({ color: 'bg-green-600', duration: waitAB, title: 'Wait A→B' });
  for (let i = 0; i < 3; i++) segments.push({ color: 'bg-amber-500', duration: 500, title: 'Start B' });
  for (const step of patternB) {
    const { barColor, symbol: sym, label } = getStepStyle(step);
    segments.push({ color: barColor, duration: step.duration, title: `B ${label}`, symbol: sym || undefined });
  }
  if (waitBA > 0) segments.push({ color: 'bg-green-600', duration: waitBA, title: 'Wait B→A' });

  const segTotal = segments.reduce((acc, s) => acc + s.duration, 0) || 1;

  const startBAfter = countdownMs + patAms + Math.max(0, waitAB);
  const startAAfter = startBAfter + countdownMs + patBms + Math.max(0, waitBA);
  const now = ((currentTimeMs % totalMs) + totalMs) % totalMs;
  const inAPattern = now >= countdownMs && now < (countdownMs + patAms);
  const inBPattern = now >= (startBAfter + countdownMs) && now < (startBAfter + countdownMs + patBms);

  const renderCycle = (keyPrefix: string) => (
    <div key={`cycle-${keyPrefix}`} className="relative h-full flex" style={{ width: '100%' }}>
      {segments.map((s, idx) => (
        <div key={`${keyPrefix}-${idx}`} className={`${s.color} relative h-full`} style={{ width: `${(s.duration / segTotal) * 100}%` }} title={`${s.title} • ${s.duration}ms`}>
          {s.symbol && (
            <span className="absolute inset-0 grid place-items-center text-[9px] leading-none text-white/90">{s.symbol}</span>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={`relative mb-4 rounded-lg border border-white/10 bg-gradient-to-br ${containerBg} min-w-0 overflow-hidden`}
      style={{ minHeight: isCompact ? '135px' : '250px' }}
      ref={rootRef}
    >
      <div className={`absolute left-3 font-semibold text-white/80 ${isCompact ? 'top-2 text-[10px]' : 'top-3 text-xs'}`}>{title}</div>

      <div className={`absolute right-3 flex items-center gap-3 ${isCompact ? 'top-2' : 'top-3'}`}>
        <div className={`flex items-center gap-2 ${inBPattern ? 'opacity-60' : 'opacity-100'}`}>
          <span className={`${isCompact ? 'text-[9px]' : 'text-[11px]'} text-white/80 max-w-[20ch] truncate`} title={gunAName}>{gunAName}</span>
          <div className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'} relative ${inBPattern ? 'opacity-50' : 'opacity-80'}`}>
            <Image src={gunAImage} alt={gunAName} fill className="object-contain invert drop-shadow" sizes="20px" />
          </div>
        </div>
        <div className={`flex items-center gap-2 ${inAPattern ? 'opacity-60' : 'opacity-100'}`}>
          <span className={`${isCompact ? 'text-[9px]' : 'text-[11px]'} text-white/80 max-w-[20ch] truncate`} title={gunBName}>{gunBName}</span>
          <div className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'} relative ${inAPattern ? 'opacity-50' : 'opacity-80'}`}>
            <Image src={gunBImage} alt={gunBName} fill className="object-contain invert drop-shadow" sizes="20px" />
          </div>
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


