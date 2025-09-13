"use client";

import { createContext, useContext, useState, useMemo, ReactNode } from 'react';

type Side = 'A' | 'B' | null;

type DualPlaybackContextValue = {
  activeSide: Side;
  isPlaying: boolean;
  setActiveSide: (side: Side) => void;
  setIsPlaying: (playing: boolean) => void;
};

const DualPlaybackContext = createContext<DualPlaybackContextValue | undefined>(undefined);

export function DualPlaybackProvider({ children }: { children: ReactNode }) {
  const [activeSide, setActiveSide] = useState<Side>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const value = useMemo(() => ({ activeSide, isPlaying, setActiveSide, setIsPlaying }), [activeSide, isPlaying]);

  return (
    <DualPlaybackContext.Provider value={value}>
      {children}
    </DualPlaybackContext.Provider>
  );
}

export function useDualPlayback() {
  const ctx = useContext(DualPlaybackContext);
  if (!ctx) {
    throw new Error('useDualPlayback must be used within DualPlaybackProvider');
  }
  return ctx;
}


