'use client';

import { useI18n } from '@/i18n/I18nProvider';

interface GlobalSettingsProps {
  waitTimeSeconds: number;
  onWaitTimeChange: (waitTime: number) => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
}

export default function GlobalSettings({ waitTimeSeconds, onWaitTimeChange, volume = 0.8, onVolumeChange }: GlobalSettingsProps) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-4 text-white">
      <h2 className="text-sm font-bold text-white/90 mb-3 tracking-wide">{t('settings.title')}</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="waitTime" className="block text-xs font-medium text-white/70 mb-2 uppercase tracking-wider">
            {t('settings.wait')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              id="waitTime"
              min="1"
              max="3.5"
              step="0.1"
              value={waitTimeSeconds}
              onChange={(e) => onWaitTimeChange(parseFloat(e.target.value))}
              className="flex-1 h-2 cursor-pointer appearance-none rounded bg-white/10 outline-none"
            />
            <span className="text-base font-semibold text-amber-300 min-w-[3rem] text-right">
              {waitTimeSeconds}s
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="volume" className="block text-xs font-medium text-white/70 mb-2 uppercase tracking-wider">
            {t('settings.volume')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              id="volume"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
              className="flex-1 h-2 cursor-pointer appearance-none rounded bg-white/10 outline-none"
            />
            <span className="text-base font-semibold text-amber-300 min-w-[3rem] text-right">
              {(volume * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
