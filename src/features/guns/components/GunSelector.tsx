'use client';

import Image from 'next/image';
import { useState, ReactNode, useEffect, useRef } from 'react';
import { Gun } from '@/features/guns/types/gun';
import { useI18n } from '@/i18n/I18nProvider';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';

interface GunSelectorProps {
  guns: Gun[];
  selectedGun: Gun | null;
  onGunSelect: (gun: Gun) => void;
  listMode?: boolean; // when true, render compact vertical list (sidebar)
  onDeleteCustom?: (gun: Gun) => void;
  onEditCustom?: (gun: Gun) => void;
  onCopyCustomize?: (gun: Gun) => void;
  onReplaceWeaponA?: (gun: Gun) => void;
  onReplaceWeaponB?: (gun: Gun) => void;
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
  'dual-either': { bgClass: 'bg-emerald-500/20', borderClass: 'border-emerald-400/40' },
  'A-active': { bgClass: 'bg-red-500/20', borderClass: 'border-red-500/40' },
  'A-inactive': { bgClass: 'bg-red-800/10', borderClass: 'border-red-700/10' },
  'B-active': { bgClass: 'bg-sky-500/20', borderClass: 'border-sky-500/40' },
  'B-inactive': { bgClass: 'bg-sky-800/10', borderClass: 'border-sky-700/10' },
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
  onCopyCustomize,
  onReplaceWeaponA,
  onReplaceWeaponB,
  labelEdit,
  labelDelete,
  labelCopy,
  labelMore,
  labelReplace1,
  labelReplace2,
}: {
  gun: Gun;
  onEditCustom?: (gun: Gun) => void;
  onDeleteCustom?: (gun: Gun) => void;
  onCopyCustomize?: (gun: Gun) => void;
  onReplaceWeaponA?: (gun: Gun) => void;
  onReplaceWeaponB?: (gun: Gun) => void;
  labelEdit: string;
  labelDelete: string;
  labelCopy: string;
  labelMore: string;
  labelReplace1: string;
  labelReplace2: string;
}) {
  const [triggerRef, containerRef, reposition] = useFixedPopper({ offsetY: 6 });
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
            {/* Replace actions */}
            {onReplaceWeaponA && (
              <MenuItem>
                {({ active }) => (
                  <button
                    type="button"
                    className={`block w-full text-left px-2 py-1.5 text-[11px] ${active ? 'bg-white/5' : ''} focus:outline-none focus-visible:outline-none ring-0 focus:ring-0`}
                    onClick={(e) => { e.stopPropagation(); onReplaceWeaponA(gun); }}
                  >
                    {labelReplace1}
                  </button>
                )}
              </MenuItem>
            )}
            {onReplaceWeaponB && (
              <MenuItem>
                {({ active }) => (
                  <button
                    type="button"
                    className={`block w-full text-left px-2 py-1.5 text-[11px] ${active ? 'bg-white/5' : ''} focus:outline-none focus-visible:outline-none ring-0 focus:ring-0`}
                    onClick={(e) => { e.stopPropagation(); onReplaceWeaponB(gun); }}
                  >
                    {labelReplace2}
                  </button>
                )}
              </MenuItem>
            )}
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
            {onCopyCustomize && (
              <MenuItem>
                {({ active }) => (
                  <button
                    type="button"
                    className={`block w-full text-left px-2 py-1.5 text-[11px] ${active ? 'bg-white/5' : ''} focus:outline-none focus-visible:outline-none ring-0 focus:ring-0`}
                    onClick={(e) => { e.stopPropagation(); onCopyCustomize(gun); }}
                  >
                    {labelCopy}
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

export default function GunSelector({ guns, selectedGun, onGunSelect, listMode = false, onDeleteCustom, onEditCustom, onCopyCustomize, onReplaceWeaponA, onReplaceWeaponB, activeSlot = 'A', highlightGunIdA = null, highlightGunIdB = null }: GunSelectorProps) {
  const { t } = useI18n();
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
      <div className="rounded-lg border border-white/10 bg-black/30 p-2 text-white overflow-auto max-h-[calc(100vh-220px)] custom-scroll">
        {groups.map((group, gi) => (
          group.items.length > 0 && (
            <div key={group.key} className={gi > 0 ? 'mt-4' : ''}>
              <div>
                <div className="w-full text-white/90 text-[12px] font-semibold uppercase tracking-wider flex items-center gap-2 px-2 py-2">
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

                  return (
                    <div key={gun.id} className="relative">
                      <div
                        draggable
                        onDragStart={(e) => {
                          try {
                            e.dataTransfer.setData('application/x-gun-id', gun.id);
                          } catch {}
                          e.dataTransfer.setData('text/plain', gun.id);
                          e.dataTransfer.effectAllowed = 'copyMove';
                        }}
                        onClick={() => onGunSelect(gun)}
                        className={`group w-full text-left p-2 rounded-md flex items-center gap-3 transition-colors border ${borderClass} ${bgClass || 'hover:bg-white/5'} ${both && activeSlot !== 'AB' ? 'overflow-hidden' : ''}`}
                        style={both && activeSlot !== 'AB' ? { clipPath: 'polygon(0 0, calc(100% - 2rem) 0, 100% 2rem, 100% 100%, 0 100%)' } as any : undefined}
                      >
                      {/* Dogear when both slots reference the same gun: show the deactivated color */}
                      {/* Background ammo accents removed */}
                      <div className="relative z-10 w-10 h-10 shrink-0">
                        <Image src={gun.image} alt={gun.name} fill className="object-contain invert" sizes="40px" />
                      </div>
                      <div className="min-w-0 pr-8">
                        <div className="text-sm font-medium truncate" title={gun.name}>{gun.name}</div>
                        <div className="text-[10px] text-white/60 uppercase tracking-wider">{categoryLabel[gun.category]}</div>
                      </div>

                      {/* Unified menu */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <GunActionsMenu
                          gun={gun}
                          onEditCustom={onEditCustom}
                          onDeleteCustom={onDeleteCustom}
                          onCopyCustomize={onCopyCustomize}
                          onReplaceWeaponA={onReplaceWeaponA}
                          onReplaceWeaponB={onReplaceWeaponB}
                          labelEdit={t('custom.edit')}
                          labelDelete={t('custom.delete')}
                          labelCopy={t('gun.copyCustomize')}
                          labelMore={t('menu.more')}
                          labelReplace1={t('gun.replaceWeapon1', { defaultValue: 'Replace Weapon 1' })}
                          labelReplace2={t('gun.replaceWeapon2', { defaultValue: 'Replace Weapon 2' })}
                        />
                      </div>
                      </div>

                      {isA && isB && activeSlot !== 'AB' && (
                        <span
                          className={`pointer-events-none absolute top-0 right-0 w-8 h-8 rounded-tr-md border ${activeSlot === 'A' ? 'bg-sky-600/10 border-sky-500/20' : 'bg-red-600/10 border-red-500/20'}`}
                          style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
                        />
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

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 mb-6 border border-white/10">
      <h2 className="text-xl font-bold text-white mb-4 text-center tracking-wide">Select Your Weapon</h2>
      
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {guns.map((gun) => {
          const isComingSoon = false;
          const isActive = selectedGun?.id === gun.id;
          // const [triggerRefCopy, containerRefCopy, repositionCopy] = useFixedPopper({ offsetY: 6 });
          return (
            <button
              key={gun.id}
              type="button"
              disabled={isComingSoon}
              onClick={() => {
                if (isComingSoon) return;
                onGunSelect(gun);
              }}
              className={`group relative p-4 rounded-lg border transition-all text-left overflow-hidden
                ${isActive ? 'border-red-500 bg-red-600/10 shadow-[0_0_0_1px_rgba(239,68,68,.4)]' : 'border-white/10 hover:border-white/20 hover:bg-white/5'} ${
                  isComingSoon ? 'opacity-60 cursor-not-allowed' : ''
                }`}
            >
              {isComingSoon && (
                <div className="absolute inset-0 z-10 grid place-items-center bg-black/60">
                  <span className="text-xs font-semibold uppercase tracking-widest text-white">Coming soon</span>
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 shrink-0">
                  <Image
                    src={gun.image}
                    alt={gun.name}
                    fill
                    className="object-contain invert drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                    sizes="64px"
                  />
                </div>
                <div className="min-w-0 pr-6">
                  <div className="text-white font-semibold truncate tracking-wide" title={gun.name}>
                    {gun.name}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 text-white/80 border border-white/15">
                      {categoryLabel[gun.category]}
                    </span>
                    <span className="text-xs text-white/60">
                      {(gun.pattern?.default ?? Object.values(gun.pattern ?? {})[0] ?? []).length} steps
                    </span>
                  </div>
                </div>
              </div>

              {/* Apex accent angle */}
              <span className={`pointer-events-none absolute -right-10 top-0 h-full w-20 skew-x-[-20deg] transition-opacity ${
                isActive ? 'bg-red-600/20 opacity-100' : 'bg-white/10 opacity-0 group-hover:opacity-100'
              }`} />

              {/* Example of using popper in grid cards if needed in future
              <Menu>
                <span className="absolute right-2 top-2">
                  <MenuButton ref={triggerRefCopy as any} className="inline-flex items-center justify-center w-7 h-7 rounded border border-white/20 bg-white/10 hover:bg-white/20" title="More">
                    <EllipsisVerticalIcon className="w-4 h-4 text-white" />
                  </MenuButton>
                </span>
                <Portal>
                  <MenuItems ref={containerRefCopy as any} className="outline-hidden w-44 divide-y divide-white/10 rounded-md border border-white/15 bg-black/90 shadow-lg" />
                </Portal>
              </Menu>
              */}
            </button>
          );
        })}
      </div>

      {selectedGun && (
        <div className="mt-5 p-3 rounded-lg border border-red-500/30 bg-red-600/10 text-red-100">
          <span className="font-semibold">{t('gun.selectedLabel', { defaultValue: 'Selected:' })}</span> {selectedGun.name}
        </div>
      )}
    </div>
  );
}
