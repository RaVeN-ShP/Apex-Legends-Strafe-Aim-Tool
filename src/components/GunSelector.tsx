'use client';

import Image from 'next/image';
import { useState, Fragment } from 'react';
import { Gun } from '@/types/gun';
import { useI18n } from '@/i18n/I18nProvider';
import { Menu, Transition } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

interface GunSelectorProps {
  guns: Gun[];
  selectedGun: Gun | null;
  onGunSelect: (gun: Gun) => void;
  listMode?: boolean; // when true, render compact vertical list (sidebar)
  onDeleteCustom?: (gun: Gun) => void;
  onEditCustom?: (gun: Gun) => void;
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

const enabledGunIds = new Set<string>(['r301', 'flatline', 'r99']);

export default function GunSelector({ guns, selectedGun, onGunSelect, listMode = false, onDeleteCustom, onEditCustom }: GunSelectorProps) {
  const { t } = useI18n();
  if (listMode) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/30 p-2 text-white overflow-auto max-h-[calc(100vh-220px)]">
        {guns.map((gun) => {
          const isComingSoon = gun.category !== 'custom' && !enabledGunIds.has(gun.id);
          const isActive = selectedGun?.id === gun.id;
          return (
            <div
              key={gun.id}
              onClick={() => {
                if (isComingSoon) return;
                onGunSelect(gun);
              }}
              className={`relative overflow-visible w-full text-left p-2 rounded-md flex items-center gap-3 transition-colors ${
                isActive ? 'bg-red-600/20 border border-red-500/40' : 'hover:bg-white/5'
              } ${isComingSoon ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {gun.category === 'custom' && (onDeleteCustom || onEditCustom) && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
                  <Menu as="div" className="relative inline-block text-left">
                    <div>
                      <Menu.Button
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center w-7 h-7 rounded border border-white/20 bg-white/10 hover:bg-white/20"
                        title="More"
                      >
                        <EllipsisVerticalIcon className="w-4 h-4 text-white" />
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 mt-1 w-36 origin-top-right rounded-md border border-white/15 bg-black/90 shadow-lg focus:outline-none">
                        {onEditCustom && (
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                type="button"
                                className={`w-full text-left px-3 py-2 text-xs ${active ? 'bg-white/10' : ''}`}
                                onClick={(e) => { e.stopPropagation(); onEditCustom(gun); }}
                              >
                                {t('custom.edit')}
                              </button>
                            )}
                          </Menu.Item>
                        )}
                        {onDeleteCustom && (
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                type="button"
                                className={`w-full text-left px-3 py-2 text-xs ${active ? 'bg-white/10' : ''}`}
                                onClick={(e) => { e.stopPropagation(); onDeleteCustom(gun); }}
                              >
                                {t('custom.delete')}
                              </button>
                            )}
                          </Menu.Item>
                        )}
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
              )}
              {isComingSoon && (
                <div className="absolute inset-0 z-10 grid place-items-center bg-black/60">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-white">Coming soon</span>
                </div>
              )}
              <div className="relative w-10 h-10 shrink-0">
                <Image src={gun.image} alt={gun.name} fill className="object-contain invert" sizes="40px" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{gun.name}</div>
                <div className="text-[10px] text-white/60 uppercase tracking-wider">{categoryLabel[gun.category]}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 mb-6 border border-white/10">
      <h2 className="text-xl font-bold text-white mb-4 text-center tracking-wide">Select Your Weapon</h2>
      
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {guns.map((gun) => {
          const isComingSoon = gun.category !== 'custom' && !enabledGunIds.has(gun.id);
          const isActive = selectedGun?.id === gun.id;
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
                <div className="min-w-0">
                  <div className="text-white font-semibold truncate tracking-wide">
                    {gun.name}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 text-white/80 border border-white/15">
                      {categoryLabel[gun.category]}
                    </span>
                    <span className="text-xs text-white/60">
                      {gun.strafePattern.length} steps
                    </span>
                  </div>
                </div>
              </div>

              {/* Apex accent angle */}
              <span className={`pointer-events-none absolute -right-10 top-0 h-full w-20 skew-x-[-20deg] transition-opacity ${
                isActive ? 'bg-red-600/20 opacity-100' : 'bg-white/10 opacity-0 group-hover:opacity-100'
              }`} />
            </button>
          );
        })}
      </div>

      {selectedGun && (
        <div className="mt-5 p-3 rounded-lg border border-red-500/30 bg-red-600/10 text-red-100">
          <span className="font-semibold">Selected:</span> {selectedGun.name}
        </div>
      )}
    </div>
  );
}
