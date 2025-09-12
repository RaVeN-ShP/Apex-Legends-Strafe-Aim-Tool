"use client";
import Image from 'next/image';
import { Pattern } from '@/features/guns/types/gun';
import { getStepStyle } from '@/config/styles';
import { useI18n } from '@/i18n/I18nProvider';
import { computeDualWaits } from '@/features/timer/audio/audio';

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
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  totalDurationMs: number;
  currentTimeMs: number;
  patternA: Pattern[];
  patternB: Pattern[];
  waitTimeSeconds: number;
  reloadTimeSecondsA?: number;
  reloadTimeSecondsB?: number;
  rootRef?: React.Ref<HTMLDivElement>;
  selectionMode?: 'A' | 'B' | 'AB';
  onChangeSelectionMode?: (mode: 'A' | 'B' | 'AB') => void;
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
    isPlaying,
    onTogglePlay,
    totalDurationMs,
    currentTimeMs,
    patternA,
    patternB,
    waitTimeSeconds,
    reloadTimeSecondsA,
    reloadTimeSecondsB,
    rootRef,
    selectionMode,
    onChangeSelectionMode,
  } = props;

  const { t } = useI18n();

  const totalMs = Math.max(1, totalDurationMs);
  const progressPct = ((currentTimeMs % totalMs) / totalMs) * 100;
  const anchorPct = 10;
  const containerOffsetPct = (100 - anchorPct) + progressPct;
  const elementTranslatePct = (containerOffsetPct % 100) / 3;
  const translateStyle = `translateX(-${elementTranslatePct.toFixed(2)}%)`;

  const countdownMs = 1500;
  const patAms = patternA.reduce((acc, s) => acc + Math.max(0, s.duration), 0);
  const patBms = patternB.reduce((acc, s) => acc + Math.max(0, s.duration), 0);
  // Unified wait computation to match audio exactly
  const { waitAB, waitBA } = computeDualWaits(reloadTimeSecondsA, reloadTimeSecondsB, waitTimeSeconds, countdownMs);

  type Seg = { color: string; duration: number; title: string; symbol?: string };
  const segments: Seg[] = [];
  for (let i = 0; i < 3; i++) segments.push({ color: 'bg-amber-500', duration: 500, title: 'Start A' });
  for (const step of patternA) {
    const { barColor, symbol: sym, label } = getStepStyle(step);
    segments.push({ color: barColor, duration: Math.max(0, step.duration), title: `A ${label}`, symbol: sym || undefined });
  }
  if (waitAB > 0) segments.push({ color: 'bg-green-600', duration: waitAB, title: 'Wait A→B' });
  for (let i = 0; i < 3; i++) segments.push({ color: 'bg-amber-500', duration: 500, title: 'Start B' });
  for (const step of patternB) {
    const { barColor, symbol: sym, label } = getStepStyle(step);
    segments.push({ color: barColor, duration: Math.max(0, step.duration), title: `B ${label}`, symbol: sym || undefined });
  }
  if (waitBA > 0) segments.push({ color: 'bg-green-600', duration: waitBA, title: 'Wait B→A' });

  // Use audio's total cycle duration to compute segment widths accurately
  const segTotal = segments.reduce((acc, s) => acc + s.duration, 0) || 1;

  const startBAfter = countdownMs + patAms + Math.max(0, waitAB);
  const startAAfter = startBAfter + countdownMs + patBms + Math.max(0, waitBA);
  const now = ((currentTimeMs % totalMs) + totalMs) % totalMs;
  const inAPattern = now < (countdownMs + patAms);
  const inBPattern = now >= (startBAfter) && now < (startBAfter + countdownMs + patBms);

  const renderCycle = (keyPrefix: string) => (
    <div key={`cycle-${keyPrefix}`} className="relative h-full flex" style={{ width: '100%' }}>
      {segments.map((s, idx) => (
        <div key={`${keyPrefix}-${idx}`} className={`${s.color} relative h-full`} style={{ width: `${(s.duration / totalMs) * 100}%` }} title={`${s.title} • ${s.duration}ms`}>
          {s.symbol && (
            <span className="absolute inset-0 grid place-items-center text-[9px] leading-none text-white/90">{s.symbol}</span>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={`group relative mb-4 rounded-lg border border-white/10 bg-gradient-to-br ${containerBg} min-w-0 overflow-hidden`}
      style={{ minHeight: isCompact ? '135px' : '250px' }}
      ref={rootRef}
    >
      <div className={`absolute left-3 font-semibold text-white/80 ${isCompact ? 'top-2 text-[11px]' : 'top-3 text-xs'}`}>{title}</div>

      <div className={`absolute right-3 flex flex-col items-center ${isCompact ? 'top-2' : 'top-3'}`}>
        <div className={`flex items-center gap-2 ${inBPattern ? 'opacity-60' : 'opacity-100'}`}>
          <div className={`${isCompact ? 'w-5 h-5' : 'w-5 h-5'} relative ${inBPattern ? 'opacity-50' : 'opacity-80'}`}>
            <Image src={gunAImage} alt={gunAName} fill className="object-contain invert drop-shadow" sizes="20px" />
          </div>
          <span className={`${isCompact ? 'text-[11px]' : 'text-[11px]'} font-semibold text-white/80 max-w-[20ch] truncate`} title={gunAName}>{gunAName}</span>
        </div>
        <div className={`flex items-center gap-2 ${inAPattern ? 'opacity-60' : 'opacity-100'}`}>
          <div className={`${isCompact ? 'w-5 h-5' : 'w-5 h-5'} relative ${inAPattern ? 'opacity-50' : 'opacity-80'}`}>
            <Image src={gunBImage} alt={gunBName} fill className="object-contain invert drop-shadow" sizes="20px" />
          </div>
          <span className={`${isCompact ? 'text-[11px]' : 'text-[11px]'} font-semibold text-white/80 max-w-[20ch] truncate`} title={gunBName}>{gunBName}</span>
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
      {isCompact && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={onTogglePlay}
              className="rounded-full bg-white/90 text-black text-xs font-semibold px-2.5 py-1.5 shadow-md border border-black/10"
              title={isPlaying ? t('display.stop') : t('display.play')}
              data-central-toggle
            >
              {isPlaying ? '■ ' + t('display.stop') : '▶ ' + t('display.play')}
            </button>
            {onChangeSelectionMode && (
              <button
                type="button"
                onClick={() => {
                  const next = selectionMode === 'A' ? 'B' : (selectionMode === 'B' ? 'AB' : 'A');
                  onChangeSelectionMode(next);
                }}
                className="rounded-full bg-white/90 text-black text-xs font-semibold px-2.5 py-1.5 shadow-md border border-black/10"
                title="Switch mode A/B/Dual"
                data-central-mode
              >
                {selectionMode === 'A' ? `Single: ${gunBName}` : (selectionMode === 'B' ? 'Dual' : `Single: ${gunAName}`)}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


