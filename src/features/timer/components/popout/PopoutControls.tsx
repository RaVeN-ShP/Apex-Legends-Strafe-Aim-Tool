import { useDocumentPictureInPicture } from '@/features/timer/hooks/useDocumentPictureInPicture';
import Image from 'next/image';
// import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useI18n } from '@/i18n/I18nProvider';
import { useEffect } from 'react';

export default function PopoutControls({ targetRef, onStateChange }: { targetRef: React.RefObject<HTMLElement | null>; onStateChange?: (isPopped: boolean) => void; }) {
  const { t } = useI18n();
  const { isPopped, open, close } = useDocumentPictureInPicture(targetRef, { width: 300, height: 150 });
  // Notify parent when state changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onStateChange?.(isPopped); }, [isPopped]);

  return (
    <>
      {!isPopped ? (
        <div className="relative group w-full">
          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-30 w-72 max-w-[calc(100vw-2rem)]">
            <div className="rounded-md border border-white/15 bg-black/90 p-2 shadow-lg">
              <div className="text-[11px] text-white/80 mb-2">{t('timer.popoutHint')}</div>
              <div className="relative w-full h-52 overflow-hidden rounded">
                <Image src="/overlay_example.png" alt="Overlay example" fill className="object-cover" />
              </div>
            </div>
          </div>
          <button onClick={open} className="w-full h-12 px-4 text-sm font-semibold rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white transition-colors" title="Pop out the display (Document Picture-in-Picture)">
            {t('timer.popout')}
          </button>
        </div>
      ) : (
        <button onClick={close} className="w-full h-12 px-4 text-sm font-semibold rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white transition-colors" title="Return the display to the page">
          {t('timer.return')}
        </button>
      )}
      {/* Banner moved to parent (StrafeTimer) for full-width placement */}
    </>
  );
}


