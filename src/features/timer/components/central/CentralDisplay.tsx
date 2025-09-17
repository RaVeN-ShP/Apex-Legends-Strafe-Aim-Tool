"use client";
import Image from 'next/image';
import { Pattern } from '@/features/guns/types/gun';
import { getStepStyle } from '@/config/styles';
import { useI18n } from '@/i18n/I18nProvider';
import { useHapticFeedback } from '@/shared/hooks/useHapticFeedback';

export type CentralDisplayProps = {
  title: string;
  subtitle: string;
  symbol: string;
  containerBg: string;
  // movementDirection is not used; remove to avoid lint errors and keep API minimal
  subtitleColor: string;
  gunName: string;
  gunImage: string;
  gunBName?: string;
  isCompact: boolean;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  totalDurationMs: number;
  currentTimeMs: number;
  pattern: Pattern[];
  waitTimeSeconds: number;
  reloadTimeSeconds?: number;
  rootRef?: React.Ref<HTMLDivElement>;
  selectionMode?: 'A' | 'B' | 'AB';
  onChangeSelectionMode?: (mode: 'A' | 'B' | 'AB') => void;
};

export default function CentralDisplay(props: CentralDisplayProps) {
  const triggerHaptic = useHapticFeedback({ duration: 'light' });
  const {
    title,
    subtitle,
    symbol,
    containerBg,
    subtitleColor,
    gunName,
    gunImage,
    gunBName,
    isCompact,
    isPlaying,
    onTogglePlay,
    totalDurationMs,
    currentTimeMs,
    pattern,
    waitTimeSeconds,
    reloadTimeSeconds,
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

  const segments: Array<{ color: string; duration: number; title: string; symbol?: string }>= [];
  for (let i = 0; i < 3; i++) segments.push({ color: 'bg-amber-500', duration: 500, title: 'Start' });
  for (const step of pattern) {
    const { barColor, symbol: sym, label } = getStepStyle(step);
    const dur = Math.max(0, step.duration);
    segments.push({ color: barColor, duration: dur, title: label, symbol: sym || undefined });
  }
  const reloadMs = Math.round(((reloadTimeSeconds ?? 1)) * 1000);
  const startDurationMs = 1500;
  const patternTotalMs = pattern.reduce((acc, s) => acc + Math.max(0, s.duration), 0);
  // Match audio timeline rounding for user delay to keep visuals in lockstep with sound
  const userDelayMs = Math.round(waitTimeSeconds * 1000);
  const endPhaseMs = Math.max(0, reloadMs - startDurationMs + userDelayMs);
  segments.push({ color: 'bg-green-600', duration: endPhaseMs, title: 'Reload+Wait' });

  // Pre-calculated percentages for hatch overlay
  const endPhaseStartMs = startDurationMs + patternTotalMs;
  const endPhaseStartPct = (endPhaseStartMs / totalMs) * 100;
  const reloadPct = (reloadMs / totalMs) * 100;
  const startPct = (startDurationMs / totalMs) * 100;
  const endPct = (endPhaseMs / totalMs) * 100;

  // Determine if we're currently within the pattern window for active styling
  const now = ((currentTimeMs % totalMs) + totalMs) % totalMs;
  const inPattern = now >= 0 && now < (startDurationMs + patternTotalMs);
  const showOnRight = selectionMode === 'B';
  const headerSideClass = showOnRight ? 'absolute right-3' : 'absolute left-3';
  const headerTopClass = isCompact ? 'top-2' : 'top-3';
  const displayedName = showOnRight ? (gunBName ?? gunName) : gunName;

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
      className={`group relative mb-4 rounded-lg border border-white/10 bg-gradient-to-br ${containerBg} min-w-0 overflow-hidden ${isCompact ? 'min-h-[135px]' : 'min-h-[140px] md:min-h-[250px]'}`}
      ref={rootRef}
    >
      <div className={`${headerSideClass} flex items-center gap-2 ${headerTopClass}`}>
        <div className={`${isCompact ? 'w-5 h-5' : 'w-5 h-5'} relative ${inPattern ? '' : 'opacity-60'}`}>
          <Image src={gunImage} alt={gunName} fill className="object-contain invert drop-shadow" sizes="20px" />
        </div>
        <span className={`${isCompact ? 'text-[11px]' : 'text-[11px]'} font-semibold max-w-[25ch] truncate ${inPattern ? 'text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'text-white/60'}`} title={displayedName}>{displayedName}</span>
      </div>

      <div className={`absolute left-1/2 -translate-x-1/2 font-semibold text-white/80 ${isCompact ? 'top-2 text-[11px]' : 'top-3 text-xs'} text-center max-w-[40ch] truncate`}>{title}</div>

      <div className={`flex items-center justify-center h-full ${isCompact ? 'pt-8' : 'pt-12 md:pt-20'}`}>
        <div className="text-center">
          <div className={`${isCompact ? 'text-[48px] md:text-[64px]' : 'text-[40px] md:text-[56px] lg:text-[84px]'} font-extrabold leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]`}>{symbol}</div>
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
              onClick={() => {
                triggerHaptic();
                onTogglePlay?.();
              }}
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
                  triggerHaptic();
                  const next = selectionMode === 'A' ? 'B' : (selectionMode === 'B' ? 'AB' : 'A');
                  onChangeSelectionMode(next);
                }}
                className="rounded-full bg-white/90 text-black text-xs font-semibold px-2.5 py-1.5 shadow-md border border-black/10"
                title="Switch mode A/B/Dual"
                data-central-mode
              >
                {selectionMode === 'A' ? `Single: ${gunBName ?? 'Weapon B'}` : (selectionMode === 'B' ? 'Dual' : `Single: ${gunName}`)}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


