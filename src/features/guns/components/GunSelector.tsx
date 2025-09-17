'use client';

import Image from 'next/image';
import { useState, ReactNode, useEffect, useRef } from 'react';
import { Gun } from '@/features/guns/types/gun';
import { useI18n } from '@/i18n/I18nProvider';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { EllipsisVerticalIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';
import { useHapticFeedback } from '@/shared/hooks/useHapticFeedback';

interface GunSelectorProps {
  guns: Gun[];
  selectedGun: Gun | null;
  onGunSelect: (gun: Gun, side?: 'A' | 'B') => void;
  listMode?: boolean; // when true, render compact vertical list (sidebar)
  onDeleteCustom?: (gun: Gun) => void;
  onEditCustom?: (gun: Gun) => void;
  activeSlot?: 'A' | 'B' | 'AB';
  highlightGunIdA?: string | null;
  highlightGunIdB?: string | null;
}

const categoryLabel: Record<Gun['category'], string> = {
  ar: 'AR',
  lmg: 'LMG',
  smg: 'SMG',
  pistol: 'Pistol',
  marksman: 'Marksman',
  sniper: 'Sniper',
  custom: 'Custom',
};

// Map gun highlight state to classes to keep logic declarative and maintainable
const highlightClassMap: Record<string, { bgClass: string; borderClass: string }> = {
  'dual-either': { bgClass: 'md:bg-gradient-to-br md:from-emerald-500/20 md:to-emerald-500/5', borderClass: 'border-emerald-600/40' },
  'A-active': { bgClass: 'md:bg-gradient-to-br md:from-red-600/20 md:to-red-600/5', borderClass: 'border-red-600/40' },
  'A-inactive': { bgClass: 'md:bg-gradient-to-br md:from-red-600/5 md:to-transparent', borderClass: 'border-red-600/10' },
  'B-active': { bgClass: 'md:bg-gradient-to-br md:from-sky-600/20 md:to-sky-600/5', borderClass: 'border-sky-600/40' },
  'B-inactive': { bgClass: 'md:bg-gradient-to-br md:from-sky-600/5 md:to-transparent', borderClass: 'border-sky-600/10' },
  'none': { bgClass: '', borderClass: 'border-transparent' },
};

function getGunHighlightClasses(isA: boolean, isB: boolean, activeSlot: 'A' | 'B' | 'AB') {
  if (activeSlot === 'AB' && (isA || isB)) return highlightClassMap['dual-either'];
  if (isA && isB) return highlightClassMap[activeSlot === 'A' ? 'A-active' : 'B-active'];
  if (isA) return highlightClassMap[`A-${activeSlot === 'A' ? 'active' : 'inactive'}`];
  if (isB) return highlightClassMap[`B-${activeSlot === 'B' ? 'active' : 'inactive'}`];
  return highlightClassMap['none'];
}

function Portal(props: { children: ReactNode }) {
  const { children } = props;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function useFixedPopper(options?: { offsetY?: number }) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const offsetY = options?.offsetY ?? 8;
  const updateRef = useRef<() => void>(() => {});

  const update = () => {
    const trigger = triggerRef.current;
    const container = containerRef.current;
    if (!trigger || !container) return;
    // Ensure visible when measuring
    container.style.visibility = 'hidden';
    container.style.display = 'block';
    const menuWidth = container.offsetWidth || 176;
    const menuHeight = container.offsetHeight || 200;
    const rect = trigger.getBoundingClientRect();
    let top = rect.bottom + offsetY; // viewport coords for position: fixed
    let left = rect.right - menuWidth; // viewport coords
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < menuHeight + offsetY + 16) {
      top = rect.top - offsetY - menuHeight;
    }
    const margin = 8;
    const minLeft = margin;
    const maxLeft = window.innerWidth - margin - menuWidth;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    container.style.position = 'fixed';
    container.style.top = `${Math.max(margin, Math.min(top, window.innerHeight - margin - menuHeight))}px`;
    container.style.left = `${left}px`;
    container.style.zIndex = '1000';
    container.style.visibility = '';
  };
  updateRef.current = update;

  useEffect(() => {
    const handler = () => updateRef.current();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    const id = window.setTimeout(() => updateRef.current(), 0);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
      window.clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateRef.current();
  });

  return [triggerRef, containerRef, () => updateRef.current()] as const;
}

function GunActionsMenu({
  gun,
  onEditCustom,
  onDeleteCustom,
  labelEdit,
  labelDelete,
  labelMore,
  onOpenReady,
}: {
  gun: Gun;
  onEditCustom?: (gun: Gun) => void;
  onDeleteCustom?: (gun: Gun) => void;
  labelEdit: string;
  labelDelete: string;
  labelMore: string;
  onOpenReady?: (opener: () => void) => void;
}) {
  const [triggerRef, containerRef, reposition] = useFixedPopper({ offsetY: 6 });
  // Expose imperative opener for long-press on mobile
  useEffect(() => {
    if (!onOpenReady) return;
    const opener = () => {
      try {
        (triggerRef.current as unknown as HTMLButtonElement | null)?.click();
      } catch {}
    };
    onOpenReady(opener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onOpenReady]);
  return (
    <Menu>
      <span>
        <MenuButton
          ref={triggerRef as unknown as React.Ref<HTMLButtonElement>}
          onClick={(e) => { e.stopPropagation(); setTimeout(reposition, 0); }}
          className="inline-flex items-center justify-center w-6 h-6 rounded border border-white/10 bg-white/5 hover:bg-white/10 focus:outline-none focus-visible:outline-none ring-0 focus:ring-0"
          title={labelMore}
        >
          <EllipsisVerticalIcon className="w-4 h-4 text-white/80" />
        </MenuButton>
      </span>
      <Portal>
        <MenuItems
          ref={(el: HTMLDivElement | null) => { (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el; reposition(); }}
          className="outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 w-40 rounded-md border border-white/10 bg-black/80 text-white shadow-md backdrop-blur-sm"
        >
          <div className="py-1">
            {gun.category === 'custom' && onEditCustom && (
              <MenuItem>
                {({ active }) => (
                  <button
                    type="button"
                    className={`block w-full text-left px-2 py-1.5 text-[11px] ${active ? 'bg-white/5' : ''} focus:outline-none focus-visible:outline-none ring-0 focus:ring-0`}
                    onClick={(e) => { e.stopPropagation(); onEditCustom(gun); }}
                  >
                    {labelEdit}
                  </button>
                )}
              </MenuItem>
            )}
            {gun.category === 'custom' && onDeleteCustom && (
              <MenuItem>
                {({ active }) => (
                  <button
                    type="button"
                    className={`block w-full text-left px-2 py-1.5 text-[11px] ${active ? 'bg-white/5' : ''} focus:outline-none focus-visible:outline-none ring-0 focus:ring-0`}
                    onClick={(e) => { e.stopPropagation(); onDeleteCustom(gun); }}
                  >
                    {labelDelete}
                  </button>
                )}
              </MenuItem>
            )}
          </div>
        </MenuItems>
      </Portal>
    </Menu>
  );
}

export default function GunSelector({ guns, selectedGun, onGunSelect, listMode = false, onDeleteCustom, onEditCustom, activeSlot = 'A', highlightGunIdA = null, highlightGunIdB = null }: GunSelectorProps) {
  const { t } = useI18n();
  const triggerHaptic = useHapticFeedback({ duration: 'light' });
  // Background accents removed per request
  if (listMode) {
    const ammoOrder: Gun['ammo'][] = ['light', 'heavy', 'energy', 'shotgun', 'sniper', 'arrow', 'care'];
    const ammoLabel: Record<string, string> = {
      light: 'Light Ammo',
      heavy: 'Heavy Ammo',
      energy: 'Energy Ammo',
      shotgun: 'Shotgun Ammo',
      sniper: 'Sniper Ammo',
      arrow: 'Arrows',
      care: 'Care Package',
      other: 'Other',
    };
    const ammoIcon: Record<string, string | undefined> = {
      light: '/ammo/Light_Rounds.svg',
      heavy: '/ammo/Heavy_Rounds.svg',
      energy: '/ammo/Energy_Ammo.svg',
      shotgun: '/ammo/Shotgun_Shells.svg',
      sniper: '/ammo/Sniper_Ammo.svg',
      arrow: '/ammo/Arrows.svg',
      care: undefined,
      other: undefined,
    };
    const groups: Array<{ key: string; items: Gun[] }> = [];
    for (const key of ammoOrder) {
      groups.push({ key: key as string, items: guns.filter(g => g.ammo === key) });
    }
    groups.push({ key: 'other', items: guns.filter(g => !g.ammo) });

    return (
      <div className="rounded-lg border border-white/10 bg-black/30 p-2 text-white md:overflow-auto md:max-h-[calc(100vh-220px)] custom-scroll">
        {groups.map((group, gi) => (
          group.items.length > 0 && (
            <div key={group.key} className={gi > 0 ? 'mt-4' : ''}>
              <div>
                <div className="w-full text-white/90 text-[12px] font-semibold uppercase tracking-wider flex items-center justify-center gap-2 px-2 py-2">
                  {ammoIcon[group.key] && (
                    <span className="relative inline-block w-4 h-4">
                      <Image src={ammoIcon[group.key]!} alt={group.key} fill className="object-contain" sizes="16px" />
                    </span>
                  )}
                  <span>{ammoLabel[group.key] || 'Other'}</span>
                </div>
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {group.items.sort((a, b) => a.name.localeCompare(b.name)).map((gun) => {
                  const isA = highlightGunIdA === gun.id;
                  const isB = highlightGunIdB === gun.id;

                  const both = isA && isB;
                  const { bgClass, borderClass } = getGunHighlightClasses(isA, isB, activeSlot);

                  // Long-press to open menu on mobile for custom guns
                  let menuOpener: (() => void) | null = null;
                  let longPressTimer: number | null = null;
                  let lastLongPressAt = 0;
                  const startLongPress = () => {
                    if (gun.category !== 'custom') return;
                    if (longPressTimer != null) window.clearTimeout(longPressTimer);
                    longPressTimer = window.setTimeout(() => {
                      lastLongPressAt = Date.now();
                      triggerHaptic();
                      if (menuOpener) menuOpener();
                    }, 500);
                  };
                  const cancelLongPress = () => {
                    if (longPressTimer != null) {
                      window.clearTimeout(longPressTimer);
                      longPressTimer = null;
                    }
                  };
                  const wasJustLongPressed = () => (Date.now() - lastLongPressAt) < 400;

                  return (
                    <div key={gun.id} className="relative rounded-md overflow-hidden">
                      <div
                        draggable
                        onDragStart={(e) => {
                          try {
                            e.dataTransfer.setData('application/x-gun-id', gun.id);
                          } catch {}
                          e.dataTransfer.setData('text/plain', gun.id);
                          e.dataTransfer.effectAllowed = 'copyMove';
                        }}
                        onClick={(e) => { if (wasJustLongPressed()) { e.preventDefault(); e.stopPropagation(); return; } onGunSelect(gun, 'A'); }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onGunSelect(gun, 'B');
                        }}
                        onTouchStart={() => { startLongPress(); }}
                        onTouchEnd={(e) => { if (wasJustLongPressed()) { e.preventDefault(); e.stopPropagation(); } cancelLongPress(); }}
                        onTouchCancel={() => { cancelLongPress(); }}
                        onTouchMove={() => { cancelLongPress(); }}
                        className={`group relative overflow-hidden w-full text-left p-2 rounded-md flex items-center justify-center md:justify-center gap-3 transition-colors hover:bg-white/5`}
                      >
                      {/* Dogear when both slots reference the same gun: show the deactivated color */}
                      {/* Background ammo accents removed */}
                      <div className="relative z-10 w-10 h-10 shrink-0">
                        <Image src={gun.image} alt={gun.name} fill className="object-contain invert" sizes="40px" />
                      </div>
                      <div className="min-w-0 pr-6 md:pr-8 text-center">
                        <div className="text-sm font-medium truncate max-w-[10ch]" title={gun.name}>{gun.name}</div>
                        <div className="text-[10px] text-white/60 uppercase tracking-wider">{categoryLabel[gun.category]}</div>
                      </div>

                      {/* Context menu: only for custom guns */}
                      {gun.category === 'custom' && (
                        <div className="hidden md:block absolute right-2 top-1/2 -translate-y-1/2 opacity-0 md:group-hover:opacity-100 transition-opacity z-40">
                          <GunActionsMenu
                            gun={gun}
                            onEditCustom={onEditCustom}
                            onDeleteCustom={onDeleteCustom}
                            labelEdit={t('custom.edit')}
                            labelDelete={t('custom.delete')}
                            labelMore={t('menu.more')}
                            onOpenReady={(opener) => { menuOpener = opener; }}
                          />
                        </div>
                      )}
                      </div>

                      {/* Mobile split-row overlay for one-tap assignment; leave right safe area for menu */}
                      <div
                        className="absolute inset-y-0 left-0 right-0 z-30 flex"
                        onTouchStart={() => { startLongPress(); }}
                        onTouchEnd={(e) => { if (wasJustLongPressed()) { e.preventDefault(); e.stopPropagation(); } cancelLongPress(); }}
                        onTouchCancel={() => { cancelLongPress(); }}
                        onTouchMove={() => { cancelLongPress(); }}
                      >
                        <button
                          type="button"
                          aria-label={t('gun.assignToA', { defaultValue: 'Assign to A' })}
                          className="relative w-1/2 h-full focus:outline-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic();
                            if (wasJustLongPressed()) { e.preventDefault(); return; }
                            onGunSelect(gun, 'A');
                          }}
                        >
                          {/* Left zone hint - only show for selected gun in slot A */}
                          {isA && (
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[10px] text-white/60">
                              <ChevronLeftIcon className="w-3 h-3" />
                              1
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label={t('gun.assignToB', { defaultValue: 'Assign to B' })}
                          className="relative w-1/2 h-full focus:outline-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic();
                            if (wasJustLongPressed()) { e.preventDefault(); return; }
                            onGunSelect(gun, 'B');
                          }}
                        >
                          {/* Right zone hint - only show for selected gun in slot B */}
                          {isB && (
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[10px] text-white/60">
                              2
                              <ChevronRightIcon className="w-3 h-3" />
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Desktop split-row overlay for one-click assignment; leave right safe area for menu */}
                      <div
                        className="hidden md:flex absolute inset-y-0 left-0 right-10 z-20"
                      >
                        <button
                          type="button"
                          aria-label={t('gun.assignToA', { defaultValue: 'Assign to A' })}
                          className="relative w-1/2 h-full focus:outline-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            onGunSelect(gun, 'A');
                          }}
                        />
                        <button
                          type="button"
                          aria-label={t('gun.assignToB', { defaultValue: 'Assign to B' })}
                          className="relative w-1/2 h-full focus:outline-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            onGunSelect(gun, 'B');
                          }}
                        />
                      </div>

                      {/* No desktop hint; A/B hints are mobile-only */}

                      {/* Mobile gradient overlays for A/B/dual highlights */}
                      {/* A gradient: left edge red -> transparent middle (mobile only; not in dual mode) */}
                      {activeSlot !== 'AB' && isA && (
                        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-red-500/25 via-red-500/0 to-transparent" />
                      )}
                      {/* B gradient: right edge sky -> transparent middle (mobile only; not in dual mode) */}
                      {activeSlot !== 'AB' && isB && (
                        <span className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-sky-500/25 via-sky-500/0 to-transparent" />
                      )}
                      {/* Dual/AB: emerald fades only on the side(s) of assigned slot(s) (mobile only) */}
                      {activeSlot === 'AB' && isA && (
                        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-emerald-500/25 via-emerald-500/0 to-transparent" />
                      )}
                      {activeSlot === 'AB' && isB && (
                        <span className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-emerald-500/25 via-emerald-500/0 to-transparent" />
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          )
        ))}
      </div>
    );
  }

}
