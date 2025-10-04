import { useCallback, useEffect, useRef, useState } from 'react';

type DocumentPictureInPicture = {
  requestWindow: (options?: { initialAspectRatio?: number; width?: number; height?: number }) => Promise<Window>;
};

export function useDocumentPictureInPicture(
  targetRef: React.RefObject<HTMLElement | null>,
  opts?: { width?: number; height?: number; onTogglePlay?: () => void; onToggleMode?: () => void; onChangeSelectionMode?: (mode: 'A' | 'B' | 'AB') => void }
) {
  const [isPopped, setIsPopped] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const onTogglePlayRef = useRef(opts?.onTogglePlay);
  const onToggleModeRef = useRef(opts?.onToggleMode);
  const onChangeSelectionModeRef = useRef(opts?.onChangeSelectionMode);

  useEffect(() => {
    onTogglePlayRef.current = opts?.onTogglePlay;
  }, [opts?.onTogglePlay]);
  useEffect(() => {
    onToggleModeRef.current = opts?.onToggleMode;
  }, [opts?.onToggleMode]);
  useEffect(() => {
    onChangeSelectionModeRef.current = opts?.onChangeSelectionMode;
  }, [opts?.onChangeSelectionMode]);

  const open = useCallback(async () => {
    const winWithDPIP = window as Window & { documentPictureInPicture?: DocumentPictureInPicture };
    if (!winWithDPIP.documentPictureInPicture || !targetRef.current) {
      alert('Popout not supported in this browser. Use latest Chrome/Edge.');
      return;
    }
    const pipWin: Window = await winWithDPIP.documentPictureInPicture.requestWindow({ width: opts?.width ?? 300, height: opts?.height ?? 150 });
    pipWindowRef.current = pipWin;
    // Copy same-origin styles
    Array.from(document.styleSheets).forEach((styleSheet) => {
      if (styleSheet instanceof CSSStyleSheet) {
        try {
          const rules: CSSRuleList = styleSheet.cssRules;
          const styleEl = pipWin.document.createElement('style');
          let cssText = '';
          for (let i = 0; i < rules.length; i++) cssText += rules[i].cssText;
          styleEl.appendChild(pipWin.document.createTextNode(cssText));
          pipWin.document.head.appendChild(styleEl);
        } catch {
          // Likely cross-origin or inaccessible; skip
        }
      }
    });
    pipWin.document.body.style.margin = '0';
    const gradient = 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)';
    pipWin.document.documentElement.style.background = gradient;
    pipWin.document.body.style.background = gradient;
    pipWin.document.body.style.color = '#ffffff';
    pipWin.document.documentElement.style.overflow = 'hidden';
    pipWin.document.body.style.overflow = 'hidden';
    pipWin.document.documentElement.style.height = '100%';
    pipWin.document.body.style.height = '100%';
    pipWin.document.documentElement.style.minWidth = '0';
    pipWin.document.body.style.minWidth = '0';
    pipWin.document.documentElement.style.minHeight = '0';
    pipWin.document.body.style.minHeight = '0';
    pipWin.document.body.style.padding = '0';

    // Insert placeholder and move node
    const originalNode = targetRef.current;
    const placeholder = document.createElement('div');
    placeholder.style.display = 'contents';
    placeholderRef.current = placeholder;
    originalNode.parentElement?.insertBefore(placeholder, originalNode);
    const container = pipWin.document.createElement('div');
    container.id = '__pip-root';
    container.style.display = 'block';
    container.style.width = '100%';
    container.style.minWidth = '0';
    container.style.minHeight = '0';
    container.appendChild(pipWin.document.adoptNode(originalNode));
    pipWin.document.body.appendChild(container);
    setIsPopped(true);

    // Wire native click for toggle inside PiP window since React events won't bubble across documents
    const onPiPClick = (ev: MouseEvent) => {
      try {
        const target = ev.target as Element | null;
        if (target && (target as Element).closest) {
          const playBtn = (target as Element).closest('[data-central-toggle]');
          if (playBtn) {
            ev.preventDefault();
            ev.stopPropagation();
            onTogglePlayRef.current?.();
            return;
          }
          const modeBtn = (target as Element).closest('[data-central-mode]') as HTMLElement | null;
          if (modeBtn) {
            ev.preventDefault();
            ev.stopPropagation();
            const raw = modeBtn.getAttribute('data-central-mode') as 'A' | 'B' | 'AB' | null;
            if (raw === 'A' || raw === 'B' || raw === 'AB') {
              onChangeSelectionModeRef.current?.(raw);
            } else {
              onToggleModeRef.current?.();
            }
          }
        }
      } catch {}
    };
    pipWin.document.addEventListener('click', onPiPClick, true);

    pipWin.addEventListener('pagehide', () => {
      try {
        if (targetRef.current && placeholderRef.current) {
          const back = document.adoptNode(targetRef.current);
          placeholderRef.current.parentElement?.replaceChild(back, placeholderRef.current);
          placeholderRef.current = null;
        }
      } finally {
        setIsPopped(false);
        pipWindowRef.current = null;
      }
      try { pipWin.document.removeEventListener('click', onPiPClick, true); } catch {}
    });
  }, [opts?.height, opts?.width, targetRef]);

  const close = useCallback(() => {
    try {
      if (pipWindowRef.current && !pipWindowRef.current.closed && targetRef.current && placeholderRef.current) {
        const back = document.adoptNode(targetRef.current);
        placeholderRef.current.parentElement?.replaceChild(back, placeholderRef.current);
        placeholderRef.current = null;
        pipWindowRef.current.close();
        pipWindowRef.current = null;
        setIsPopped(false);
      }
    } catch {}
  }, [targetRef]);

  useEffect(() => {
    return () => {
      try { close(); } catch {}
    };
  }, [close]);

  return { isPopped, open, close, pipWindow: pipWindowRef.current } as const;
}


