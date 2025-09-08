"use client";

import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { Gun, Pattern } from "@/features/guns/types/gun";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { useI18n } from "@/i18n/I18nProvider";

export default function PatternImportPicker({
  guns,
  importGunId,
  importVariantKey,
  onChangeGunId,
  onChangeVariantKey,
  onCopy,
}: {
  guns: Gun[];
  importGunId: string | null;
  importVariantKey: string | null;
  onChangeGunId: (id: string | null) => void;
  onChangeVariantKey: (key: string | null) => void;
  onCopy: (steps: Pattern[]) => void;
}) {
  const { t } = useI18n();
  const selectedGun = guns.find(g => g.id === importGunId) || null;
  const variantKeys = selectedGun ? Object.keys(selectedGun.pattern ?? {}) : [];
  const resolvedVariantKey = importVariantKey && variantKeys.includes(importVariantKey)
    ? importVariantKey
    : (variantKeys.includes('default') ? 'default' : variantKeys[0]);
  const hasMultipleVariants = !!importGunId && variantKeys.length > 1;
  // Ensure gun ordering matches GunSelector (sidebar): by ammo group, then by name
  const ammoOrder: Array<NonNullable<Gun['ammo']>> = ['light', 'heavy', 'energy', 'shotgun', 'sniper', 'arrow', 'care'];
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
  const getAmmoRank = (ammo?: Gun['ammo']) => {
    if (!ammo) return ammoOrder.length; // place unknown/undefined ammo at the end ("other")
    const idx = ammoOrder.indexOf(ammo as NonNullable<Gun['ammo']>);
    return idx === -1 ? ammoOrder.length : idx;
  };
  const orderedGuns = [...guns].sort((a, b) => {
    const ar = getAmmoRank(a.ammo);
    const br = getAmmoRank(b.ammo);
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name);
  });
  const groups: Array<{ key: string; items: Gun[] }> = [];
  for (const key of ammoOrder) {
    groups.push({ key, items: orderedGuns.filter(g => g.ammo === key) });
  }
  groups.push({ key: 'other', items: orderedGuns.filter(g => !g.ammo || !ammoOrder.includes(g.ammo as NonNullable<Gun['ammo']>)) });

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="text-[11px] text-white/60 mb-2">{t('importPicker.importFrom')}</div>
      <div className="flex flex-wrap items-center gap-2">
        <Listbox value={importGunId} onChange={(v: string | null) => { onChangeGunId(v); onChangeVariantKey(null); }}>
          <div className="relative">
            <Listbox.Button className="text-xs h-8 px-2 rounded border border-white/15 bg-black/20 min-w-[180px] text-left">
              {selectedGun ? selectedGun.name : t('importPicker.selectGun')}
            </Listbox.Button>
            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Listbox.Options className="absolute z-20 mt-1 max-h-[70vh] overflow-auto w-full rounded-md border border-white/15 bg-black/90 shadow-lg focus:outline-none custom-scroll">
                {groups.map((group, gi) => (
                  group.items.length > 0 && (
                    <div key={group.key}>
                      <div className={`px-2 py-1 text-[10px] uppercase tracking-wider text-white/60 flex items-center gap-2 ${gi > 0 ? 'border-t border-white/10 mt-1 pt-2' : ''} sticky top-0 bg-black/90`}> 
                        {ammoIcon[group.key] && (
                          <span className="inline-block w-3.5 h-3.5">
                            <img src={ammoIcon[group.key]!} alt={group.key} className="object-contain w-full h-full" />
                          </span>
                        )}
                        <span>{ammoLabel[group.key] || 'Other'}</span>
                      </div>
                      <div className="py-0.5">
                        {group.items.map((g) => (
                          <Listbox.Option key={g.id} value={g.id} className={({ active }) => `px-2 py-1.5 text-xs ${active ? 'bg-white/10' : ''}`}>
                            {g.name}
                          </Listbox.Option>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
        <Transition
          show={hasMultipleVariants}
          enter="transition ease-out duration-150"
          enterFrom="opacity-0 -translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 -translate-y-1"
        >
          <div>
            <Listbox value={importVariantKey} onChange={(v: string | null) => onChangeVariantKey(v)} disabled={!importGunId}>
              <div className="relative">
                <Listbox.Button className={`text-xs h-8 px-2 rounded border border-red-500 bg-red-600/20 text-red-200 capitalize min-w-[140px] text-left`}>
                   {importGunId ? (resolvedVariantKey || t('importPicker.variant')) : t('importPicker.variant')}
                </Listbox.Button>
                <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                  <Listbox.Options className="absolute z-20 mt-1 max-h-48 overflow-auto w-full rounded-md border border-white/15 bg-black/90 shadow-lg focus:outline-none">
                    {variantKeys.map((k) => (
                      <Listbox.Option key={k} value={k} className={({ active }) => `px-2 py-1.5 text-xs capitalize ${active ? 'bg-white/10' : ''}`}>
                        {k}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
          </div>
        </Transition>
        <button
          type="button"
          onClick={() => {
            if (!selectedGun) return;
            const key = resolvedVariantKey || 'default';
            const steps = (selectedGun.pattern?.[key] ?? []).map((s) => ({ ...s }));
            onCopy(steps);
          }}
          className="inline-flex items-center gap-1.5 text-xs h-8 px-2 rounded border border-white/15 bg-black/20 hover:bg-white/10"
          title={t('importPicker.copyTitle')}
        >
          <ArrowsRightLeftIcon className="w-4 h-4" />
          {t('importPicker.copy')}
        </button>
      </div>
    </div>
  );
}


