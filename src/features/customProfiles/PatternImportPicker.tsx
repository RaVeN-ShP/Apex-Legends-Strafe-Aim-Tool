"use client";

import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { Gun, Pattern } from "@/features/guns/types/gun";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";

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
  const selectedGun = guns.find(g => g.id === importGunId) || null;
  const variantKeys = selectedGun ? Object.keys(selectedGun.pattern ?? {}) : [];
  const resolvedVariantKey = importVariantKey && variantKeys.includes(importVariantKey)
    ? importVariantKey
    : (variantKeys.includes('default') ? 'default' : variantKeys[0]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="text-[11px] text-white/60 mb-2">Import from</div>
      <div className="flex flex-wrap items-center gap-2">
        <Listbox value={importGunId} onChange={(v: string | null) => { onChangeGunId(v); onChangeVariantKey(null); }}>
          <div className="relative">
            <Listbox.Button className="text-xs h-8 px-2 rounded border border-white/15 bg-black/20 min-w-[180px] text-left">
              {selectedGun ? selectedGun.name : 'Select gun'}
            </Listbox.Button>
            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Listbox.Options className="absolute z-20 mt-1 max-h-56 overflow-auto w-full rounded-md border border-white/15 bg-black/90 shadow-lg focus:outline-none">
                {guns.map((g) => (
                  <Listbox.Option key={g.id} value={g.id} className={({ active }) => `px-2 py-1.5 text-xs ${active ? 'bg-white/10' : ''}`}>
                    {g.name}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
        <Listbox value={importVariantKey} onChange={(v: string | null) => onChangeVariantKey(v)} disabled={!importGunId}>
          <div className="relative">
            <Listbox.Button className={`text-xs h-8 px-2 rounded border border-white/15 ${importGunId ? 'bg-black/20' : 'bg-black/20 opacity-50'} min-w-[140px] text-left`}>
              {importGunId ? (resolvedVariantKey || 'Variant') : 'Variant'}
            </Listbox.Button>
            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Listbox.Options className="absolute z-20 mt-1 max-h-48 overflow-auto w-full rounded-md border border-white/15 bg-black/90 shadow-lg focus:outline-none">
                {variantKeys.map((k) => (
                  <Listbox.Option key={k} value={k} className={({ active }) => `px-2 py-1.5 text-xs ${active ? 'bg-white/10' : ''}`}>
                    {k}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
        <button
          type="button"
          onClick={() => {
            if (!selectedGun) return;
            const key = resolvedVariantKey || 'default';
            const steps = (selectedGun.pattern?.[key] ?? []).map((s) => ({ ...s }));
            onCopy(steps);
          }}
          className="inline-flex items-center gap-1.5 text-xs h-8 px-2 rounded border border-white/15 bg-black/20 hover:bg-white/10"
          title="Copy pattern"
        >
          <ArrowsRightLeftIcon className="w-4 h-4" />
          Copy
        </button>
      </div>
    </div>
  );
}


