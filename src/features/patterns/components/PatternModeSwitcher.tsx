"use client";

import { Pattern } from "@/features/guns/types/gun";

export default function PatternModeSwitcher({
  patternMap,
  selectedKey,
  onSelect,
  className,
}: {
  patternMap?: Record<string, Pattern[]>;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  className?: string;
}) {
  const allKeys = Object.keys(patternMap ?? {});
  const keys = allKeys.filter((k) => k !== 'default');
  if (!patternMap || keys.length === 0) return null;
  return (
    <div className={className ?? "flex flex-wrap items-center gap-2"}>
      {keys.map((key) => {
        const label = key;
        const active = key === selectedKey;
        return (
          <button
            key={key}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(key)}}
            onMouseDown={(e) => { e.stopPropagation(); }}
            onTouchStart={(e) => { e.stopPropagation(); }} 
            className={`text-xs px-2 py-1 rounded border capitalize ${active ? 'border-red-500 bg-red-600/20 text-red-200' : 'border-white/15 bg-white/5 text-white/90 hover:bg-white/10'}`}
            title={label}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}


