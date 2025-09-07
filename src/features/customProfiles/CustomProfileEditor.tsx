"use client";

import { useState, useMemo } from "react";
import { Pattern, Gun } from "@/features/guns/types/gun";
import PatternVisualizer from "@/features/patterns/components/PatternVisualizer";
import StrafeTimer from "@/features/timer/components/StrafeTimer";
import PatternImportPicker from "@/features/customProfiles/PatternImportPicker";
import { useI18n } from "@/i18n/I18nProvider";
import { Listbox, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { PlusIcon, TrashIcon, ClockIcon } from "@heroicons/react/24/outline";

export default function CustomProfileEditor({
  allGuns,
  initialName,
  initialSteps,
  initialReloadTimeSeconds,
  volume,
  onVolumeChange,
  resetToken,
  onCancel,
  onSave,
}: {
  allGuns: Gun[];
  initialName: string;
  initialSteps: Pattern[];
  initialReloadTimeSeconds?: number;
  volume: number;
  onVolumeChange: (v: number) => void;
  resetToken?: string | number;
  onCancel: () => void;
  onSave: (name: string, steps: Pattern[], reloadTimeSeconds: number) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState<string>(initialName);
  const [steps, setSteps] = useState<Pattern[]>(initialSteps);
  const [reloadTimeSeconds, setReloadTimeSeconds] = useState<number>(Number.isFinite(initialReloadTimeSeconds) ? (initialReloadTimeSeconds as number) : 1.5);
  const [importGunId, setImportGunId] = useState<string | null>(null);
  const [importVariantKey, setImportVariantKey] = useState<string | null>(null);
  const [localResetToken, setLocalResetToken] = useState<number>(0);

  const bumpReset = () => setLocalResetToken((v) => v + 1);

  const isValid = name.trim().length > 0 && steps.length > 0 && steps.every((s) => Number.isFinite(s.duration) && s.duration > 0) && Number.isFinite(reloadTimeSeconds) && reloadTimeSeconds >= 0;

  const addStep = () => { setSteps((prev) => [...prev, { type: 'direction', direction: 'left', duration: 200 }]); bumpReset(); };
  const removeStep = (idx: number) => { setSteps((prev) => prev.filter((_, i) => i !== idx)); bumpReset(); };
  const updateStep = (idx: number, step: Partial<Pattern> & { direction?: 'left' | 'right' }) => {
    setSteps((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      var base: Pattern = { ...s } as Pattern;
      if (step.type) base.type = step.type;
      if (typeof step.direction !== 'undefined' && base.type === 'direction') {
        base = { ...base, direction: step.direction } as Pattern;
      }
      if (typeof step.duration !== 'undefined') base = { ...base, duration: step.duration } as Pattern;
      return base;
    }));
    bumpReset();
  };

  const draftGun = useMemo<Gun>(() => ({
    id: 'draft',
    name: name || 'Draft',
    category: 'custom' as const,
    image: '/favicon.ico',
    pattern: { default: steps },
    reloadTimeSeconds,
  }), [name, steps, reloadTimeSeconds]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xl font-bold tracking-wide">{t('custom.createTitle', { defaultValue: 'Create Custom Pattern' })}</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="text-sm px-3 py-1.5 rounded-md border border-white/15 bg-white/5 hover:bg-white/10" title={t('custom.cancel')}>
            {t('custom.cancel')}
          </button>
          <button
            type="button"
            disabled={!isValid}
            onClick={() => onSave(name.trim(), steps.map((s) => ({ ...s, duration: Math.round(s.duration) })), reloadTimeSeconds)}
            className={`text-sm px-3 py-1.5 rounded-md ${isValid ? 'bg-red-600 hover:bg-red-700' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}
            title={t('custom.save')}
          >
            {t('custom.save')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-3">
          <PatternImportPicker
            guns={allGuns}
            importGunId={importGunId}
            importVariantKey={importVariantKey}
            onChangeGunId={(v) => { setImportGunId(v); setImportVariantKey(null); }}
            onChangeVariantKey={setImportVariantKey}
            onCopy={(copied) => {
              setSteps(copied);
              const g = allGuns.find(x => x.id === importGunId) || null;
              if (g && Number.isFinite(g.reloadTimeSeconds)) {
                setReloadTimeSeconds(g.reloadTimeSeconds as number);
              }
              // Update name to "{weapon name} - Copy" format
              if (g) {
                setName(`${g.name} - Copy`);
              }
              // Reset import selections
              setImportGunId(null);
              setImportVariantKey(null);
              bumpReset();
            }}
          />

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-8 rounded-lg border border-white/10 bg-white/5 p-3">
              <label className="block text-[11px] text-white/60 mb-1">{t('custom.name')}</label>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); bumpReset(); }}
                className="w-full h-9 px-2 text-sm rounded bg-black/20 border border-white/10 outline-none focus:border-white/30"
                placeholder={t('custom.name')}
              />
            </div>
            <div className="col-span-4 rounded-lg border border-white/10 bg-white/5 p-3">
              <label className="block text-[11px] text-white/60 mb-1">{t('custom.reloadTime')}</label>
              <input 
                type="number"
                min={0}
                step={0.01}
                value={reloadTimeSeconds}
                onChange={(e) => { setReloadTimeSeconds(Math.max(0, Number(e.target.value))); bumpReset(); }}
                className="w-full h-9 px-2 text-sm rounded bg-black/20 border border-white/10 outline-none focus:border-white/30"
                placeholder="1.5"
              />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-white/90">{t('custom.steps')}</div>
              <button type="button" onClick={addStep} className="inline-flex items-center gap-1.5 text-xs h-8 px-2 rounded border border-white/15 bg-black/20 hover:bg-white/10">
                <PlusIcon className="w-4 h-4" />
                {t('custom.addStep')}
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((s, idx) => (
                <div key={idx} className="rounded-md border border-white/10 bg-black/20 px-2 py-2 flex flex-wrap items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/10 text-white/80 text-[11px] inline-flex items-center justify-center select-none">{idx + 1}</div>
                  <Listbox value={s.type} onChange={(v: Pattern['type']) => updateStep(idx, { type: v })}>
                    <div className="relative">
                      <Listbox.Button className="text-xs h-8 px-2 rounded border border-white/15 bg-black/30 min-w-[100px] text-left">{s.type === 'direction' ? 'Direction' : 'Shoot'}</Listbox.Button>
                      <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <Listbox.Options className="absolute z-20 mt-1 w-full rounded-md border border-white/15 bg-black/90 shadow-lg focus:outline-none">
                          <Listbox.Option value="direction" className={({ active }) => `px-2 py-1.5 text-xs ${active ? 'bg-white/10' : ''}`}>Direction</Listbox.Option>
                          <Listbox.Option value="shoot" className={({ active }) => `px-2 py-1.5 text-xs ${active ? 'bg-white/10' : ''}`}>Shoot</Listbox.Option>
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </Listbox>
                  {s.type === 'direction' && (
                    <Listbox value={s.direction} onChange={(v: 'left' | 'right') => updateStep(idx, { direction: v })}>
                      <div className="relative">
                        <Listbox.Button className="text-xs h-8 px-2 rounded border border-white/15 bg-black/30 min-w-[90px] text-left">{s.direction === 'left' ? t('custom.left') : t('custom.right')}</Listbox.Button>
                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                          <Listbox.Options className="absolute z-20 mt-1 w-full rounded-md border border-white/15 bg-black/90 shadow-lg focus:outline-none">
                            <Listbox.Option value="left" className={({ active }) => `px-2 py-1.5 text-xs ${active ? 'bg-white/10' : ''}`}>{t('custom.left')}</Listbox.Option>
                            <Listbox.Option value="right" className={({ active }) => `px-2 py-1.5 text-xs ${active ? 'bg-white/10' : ''}`}>{t('custom.right')}</Listbox.Option>
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                  )}
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} value={s.duration} onChange={(e) => updateStep(idx, { duration: Number(e.target.value) })} className="w-24 h-8 px-2 text-xs rounded bg-black/30 border border-white/10 outline-none focus:border-white/30" />
                    <div className="text-[11px] text-white/60 inline-flex items-center gap-1 whitespace-nowrap leading-none">
                      <ClockIcon className="w-3.5 h-3.5 -mt-px" /> {t('custom.durationMs')}
                    </div>
                  </div>
                  <div className="w-full sm:w-auto sm:ml-auto">
                    <button type="button" onClick={() => removeStep(idx)} className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs h-8 px-2 rounded border border-white/15 bg-black/30 hover:bg-white/10" title={t('custom.delete')}>
                      <TrashIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('custom.delete')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <div className="text-sm font-semibold mb-2">{t('custom.preview', { defaultValue: 'Preview' })}</div>
          <PatternVisualizer gun={draftGun} pattern={steps} />
          <div className="mt-3 overflow-x-auto">
            <StrafeTimer gun={draftGun} pattern={steps} volume={volume} onVolumeChange={onVolumeChange} resetToken={`${resetToken ?? ''}:${localResetToken}`} />
          </div>
        </div>
      </div>
    </div>
  );
}


