"use client";
import Image from 'next/image';
import { UISegment } from '@/features/timer/core/timelineView';
import { useI18n } from '@/i18n/I18nProvider';

export type CoreCentralHeader = {
  name: string;
  image: string;
  emphasis?: boolean;
  side: 'left' | 'right';
  subtitle?: string | React.ReactNode;
};

export type CoreCentralOverlaySelection = {
  mode?: 'A' | 'B' | 'AB';
  onChange?: (mode: 'A' | 'B' | 'AB') => void;
  invertMode?: 'selected' | 'unselected';
  a?: { name: string; image: string; enabled?: boolean };
  b?: { name: string; image: string; enabled?: boolean };
  abEnabled?: boolean;
};

export type CoreCentralOverlay = {
  show: boolean;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  selection?: CoreCentralOverlaySelection;
  playLabel?: string;
  stopLabel?: string;
  playTitle?: string;
  stopTitle?: string;
};

export type CoreCentralCenter = {
  title: string;
  badgeIconSrc?: string;
  badgeAlt?: string;
  symbol: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  subtitleColor?: string;
};

export type CoreCentralProgress = {
  totalDurationMs: number;
  currentTimeMs: number;
  segments: UISegment[];
};

export type CoreCentralProps = {
  isCompact: boolean;
  containerBg: string;
  leftHeader?: CoreCentralHeader;
  rightHeader?: CoreCentralHeader;
  center: CoreCentralCenter;
  progress: CoreCentralProgress;
  overlay?: CoreCentralOverlay;
  /** Optional overlay to render on top of the progress bar (single-mode reload, etc.) */
  progressOverlay?: React.ReactNode;
  rootRef?: React.Ref<HTMLDivElement>;
};

export default function CoreCentral(props: CoreCentralProps) {
  const { isCompact, containerBg, leftHeader, rightHeader, center, progress, overlay, progressOverlay, rootRef } = props;

  const { t } = useI18n();

  const totalMs = Math.max(1, progress.totalDurationMs);
  const progressPct = ((progress.currentTimeMs % totalMs) / totalMs) * 100;
  const anchorPct = 10;
  const containerOffsetPct = (100 - anchorPct) + progressPct;
  const elementTranslatePct = (containerOffsetPct % 100) / 3;
  const leftPct = -(elementTranslatePct * 3);

  const segTotal = progress.segments.reduce((acc, s) => acc + s.duration, 0) || 1;

  const headerTopClass = isCompact ? 'top-2' : 'top-3';

  const renderCycle = (keyPrefix: string) => (
    <div key={`cycle-${keyPrefix}`} className="relative h-full flex" style={{ width: '100%' }}>
      {progress.segments.map((s, idx) => (
        <div key={`${keyPrefix}-${idx}`} className={`${s.colorClass} relative h-full`} style={{ width: `${(s.duration / segTotal) * 100}%` }} title={`${s.title} • ${s.duration}ms`}>
          {s.symbol && (
            <span className={`absolute inset-0 grid place-items-center text-[9px] leading-none font-extrabold leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)] ${s.textColor ?? 'text-white/90'}`}>{s.symbol}</span>
          )}
        </div>
      ))}
    </div>
  );

  const renderHeader = (header?: CoreCentralHeader) => {
    if (!header) return null;
    const sideClass = header.side === 'right' ? `absolute right-3` : `absolute left-3`;
    const sideClassSubtitle= header.side === 'right' ? `absolute right-0` : `absolute left-0`;
    const emphasis = header.emphasis !== false;
    return (
      <div className={`${sideClass} ${headerTopClass}`}>
        <div className={`inline-flex items-center gap-2 rounded-md border px-1.5 py-1 ${emphasis ? 'border-amber-300/50 bg-amber-400/10' : 'border-white/10 bg-black/10'}`}>
          <div className={`${isCompact ? 'w-5 h-5' : 'w-5 h-5'} relative ${emphasis ? '' : 'opacity-60'}`}>
            <Image src={header.image} alt={header.name} fill className={`object-contain invert ${emphasis ? 'drop-shadow' : 'drop-shadow-none'}`} sizes="20px" />
          </div>
          <div className="min-w-0">
            <div className={`${isCompact ? 'text-[11px]' : 'text-[11px]'} font-semibold max-w-[25ch] truncate ${emphasis ? 'text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'text-white/70'}`} title={header.name}>{header.name}</div>
          </div>
        </div>
        {header.subtitle && (
          <div className={`filter saturate-[.7] ${sideClassSubtitle}`}>{header.subtitle}</div>
        )}
      </div>
    );
  };

  const invertFor = (mode: 'A' | 'B' | 'AB', selection?: CoreCentralOverlaySelection) => {
    if (!selection || !selection.mode) return '';
    const isSelected = selection.mode === mode;
    return isSelected ? '' : 'invert';
  };

  return (
    <div
      className={`group relative mb-4 rounded-lg border border-white/10 bg-gradient-to-br ${containerBg} min-w-0 overflow-hidden select-none ${isCompact ? 'min-h-[135px]' : 'min-h-[140px] md:min-h-[250px]'}`}
      ref={rootRef}
    >
      {renderHeader(leftHeader)}
      {renderHeader(rightHeader)}

      <div className={`absolute left-1/2 -translate-x-1/2 font-semibold text-white/80 ${isCompact ? 'top-2 text-[11px]' : 'top-3 text-xs'} text-center max-w-[40ch] truncate`}>
        <span className="inline-flex items-center gap-1 align-middle">
          <span>{center.title}</span>
          {center.badgeIconSrc && (
            <span className="inline-flex items-center justify-center rounded-md border border-amber-400/50 bg-amber-500/30 text-amber-200 px-1 py-1">
              <Image
                src={center.badgeIconSrc}
                alt={center.badgeAlt || ''}
                width={8}
                height={8}
                className="invert"
              />
            </span>
          )}
        </span>
      </div>

      <div className={`flex items-center justify-center h-full ${isCompact ? 'pt-8' : 'pt-12 md:pt-20'}`}>
        <div className="text-center">
          <div className={`${isCompact ? 'text-[48px] md:text-[64px]' : 'text-[40px] md:text-[56px] lg:text-[84px]'} font-extrabold leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]`}>{center.symbol}</div>
          {center.subtitle && (
            <div className={`mt-2 ${isCompact ? 'text-xs' : 'text-sm'} font-semibold ${center.subtitleColor || 'text-white/70'}`}>{center.subtitle}</div>
          )}
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-2 px-3">
        <div className="relative">
          <div className="h-3 w-full rounded-md overflow-hidden bg-white/10 border border-white/10 relative">
            <div className="h-full flex absolute top-0 left-0" style={{ width: '300%', left: `${leftPct.toFixed(2)}%` }}>
              {renderCycle('prev')}
              {renderCycle('curr')}
              {renderCycle('next')}
            </div>
            {/* Overlay duplicated per cycle in a sibling 300% container with identical offset */}
            {progressOverlay && (
              <div className="h-full flex absolute top-0 left-0 z-20 pointer-events-none" style={{ width: '300%', left: `${leftPct.toFixed(2)}%` }}>
                <div className="relative h-full" style={{ width: '100%' }}>
                  <div className="absolute inset-0">
                    {progressOverlay}
                  </div>
                </div>
                <div className="relative h-full" style={{ width: '100%' }}>
                  <div className="absolute inset-0">
                    {progressOverlay}
                  </div>
                </div>
                <div className="relative h-full" style={{ width: '100%' }}>
                  <div className="absolute inset-0">
                    {progressOverlay}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 z-30">
            <div className="absolute left-[10%] -translate-x-1/2 -top-3 text-white/80 text-xs select-none">▼</div>
            <div className="absolute left-[10%] -translate-x-1/2 top-0 h-3 w-[2px] bg-white/80" />
          </div>
        </div>
      </div>

      {overlay?.show && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="inline-flex rounded-md overflow-hidden border border-white/15 bg-black/40 backdrop-blur px-0.5 py-0.5 shadow pointer-events-auto">
              <button
                type="button"
                onClick={() => overlay.onTogglePlay?.()}
                className={`px-2 py-1 text-[11px] font-semibold rounded-sm ${overlay.isPlaying ? 'bg-white/90 text-black' : 'text-white/80 hover:text-white'}`}
                title={overlay.isPlaying ? (overlay.stopTitle ?? overlay.stopLabel ?? 'Stop') : (overlay.playTitle ?? overlay.playLabel ?? 'Play')}
                data-central-toggle
              >
                {overlay.isPlaying ? `■ ${overlay.stopLabel ?? 'Stop'}` : `▶ ${overlay.playLabel ?? 'Play'}`}
              </button>
            </div>

            {overlay.selection?.onChange && (
              <div className="inline-flex rounded-md overflow-hidden border border-white/15 bg-black/40 backdrop-blur px-0.5 py-0.5 shadow pointer-events-auto">
                <button
                  type="button"
                  className={`px-2 py-1 text-[11px] font-semibold rounded-sm inline-flex items-center gap-1 ${overlay.selection.mode === 'A' ? 'bg-white/90 text-black' : 'text-white/80 hover:text-white'}`}
                  data-central-mode="A"
                  onClick={() => overlay.selection?.onChange?.('A')}
                >
                  <span className="relative w-4 h-4 inline-block align-middle">
                    {overlay.selection?.a?.image && (
                      <Image src={overlay.selection.a.image} alt={overlay.selection.a.name} fill className={`object-contain ${invertFor('A', overlay.selection)}`} sizes="16px" />
                    )}
                  </span>
                  <span className="max-w-[16ch] truncate">{overlay.selection?.a?.name ?? 'A'}</span>
                </button>
                <button
                  type="button"
                  disabled={!overlay.selection?.b?.enabled}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-sm inline-flex items-center gap-1 ${overlay.selection.mode === 'B' ? 'bg-white/90 text-black' : 'text-white/80 hover:text-white'} ${overlay.selection?.b?.enabled === false ? 'opacity-40 pointer-events-none' : ''}`}
                  data-central-mode="B"
                  onClick={() => overlay.selection?.b?.enabled && overlay.selection?.onChange?.('B')}
                >
                  <span className="relative w-4 h-4 inline-block align-middle">
                    {overlay.selection?.b?.image && (
                      <Image src={overlay.selection.b.image} alt={overlay.selection.b.name} fill className={`object-contain ${invertFor('B', overlay.selection)}`} sizes="16px" />
                    )}
                  </span>
                  <span className="max-w-[16ch] truncate">{overlay.selection?.b?.name ?? 'B'}</span>
                </button>
                <button
                  type="button"
                  disabled={!overlay.selection?.abEnabled}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-sm inline-flex items-center gap-1 ${overlay.selection.mode === 'AB' ? 'bg-white/90 text-black' : 'text-white/80 hover:text-white'} ${overlay.selection?.abEnabled === false ? 'opacity-40 pointer-events-none' : ''}`}
                  data-central-mode="AB"
                  onClick={() => overlay.selection?.abEnabled && overlay.selection?.onChange?.('AB')}
                >
                  <span className="relative w-4 h-4 inline-block align-middle">
                    {overlay.selection?.a?.image && (
                      <Image src={overlay.selection.a.image} alt={overlay.selection.a.name} fill className={`object-contain ${invertFor('AB', overlay.selection)}`} sizes="16px" />
                    )}
                  </span>
                  <span className="max-w-[24ch] truncate">{` + `}</span>
                  <span className="relative w-4 h-4 inline-block align-middle">
                    {overlay.selection?.b?.image && (
                      <Image src={overlay.selection.b.image} alt={overlay.selection.b.name} fill className={`object-contain ${invertFor('AB', overlay.selection)}`} sizes="16px" />
                    )}
                  </span>
                  <span className="max-w-[24ch] truncate">{t('tabs.dual')}</span>

                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


