"use client";

import { Gun, Pattern } from "@/features/guns/types/gun";
import GunSelector from "@/features/guns/components/GunSelector";
import { useI18n } from "@/i18n/I18nProvider";

export default function GunsSidebar({
  guns,
  selectedGun,
  selectedPatternKey,
  onSelectGun,
  onStartCreate,
  onStartEdit,
  onStartCopy,
  onDeleteProfile,
  onReplaceWeaponA,
  onReplaceWeaponB,
  selectionMode,
  highlightGunIdA,
  highlightGunIdB,
}: {
  guns: Gun[];
  selectedGun: Gun | null;
  selectedPatternKey: string | null;
  onSelectGun: (gun: Gun | null) => void;
  onStartCreate: () => void;
  onStartEdit: (profileId: string) => void;
  onStartCopy: (name: string, steps: Pattern[], reloadTimeSeconds?: number) => void;
  onDeleteProfile: (profileId: string) => void;
  onReplaceWeaponA?: (gun: Gun) => void;
  onReplaceWeaponB?: (gun: Gun) => void;
  selectionMode?: 'A' | 'B' | 'AB';
  highlightGunIdA?: string | null;
  highlightGunIdB?: string | null;
}) {
  const { t } = useI18n();

  return (
    <div>
      <div className="mb-2">
        <button
          type="button"
          onClick={onStartCreate}
          className="w-full text-sm font-semibold px-3 py-2 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white"
        >
          {t('custom.createTop', { defaultValue: 'Create Custom' })}
        </button>
      </div>
      <GunSelector
        guns={guns}
        selectedGun={selectedGun}
        onGunSelect={(g) => { onSelectGun(g); }}
        onReplaceWeaponA={onReplaceWeaponA}
        onReplaceWeaponB={onReplaceWeaponB}
        activeSlot={selectionMode}
        highlightGunIdA={highlightGunIdA ?? null}
        highlightGunIdB={highlightGunIdB ?? null}
        onDeleteCustom={(g) => {
          if (g.category !== 'custom') return;
          const ok = window.confirm(t('custom.confirmDelete', { defaultValue: 'Delete this custom pattern?' }));
          if (!ok) return;
          const id = g.id.startsWith('custom:') ? g.id.slice('custom:'.length) : g.id;
          onDeleteProfile(id);
          if (selectedGun?.id === g.id) {
            const next = guns.find((x) => x.id !== g.id) || guns[0] || null;
            onSelectGun(next ?? null);
          }
        }}
        onEditCustom={(g) => {
          if (g.category !== 'custom') return;
          const id = g.id.startsWith('custom:') ? g.id.slice('custom:'.length) : g.id;
          onStartEdit(id);
        }}
        onCopyCustomize={(g) => {
          const keys = Object.keys(g.pattern ?? {});
          const variantKey = (selectedGun?.id === g.id && selectedPatternKey && keys.includes(selectedPatternKey))
            ? selectedPatternKey
            : (keys.includes('default') ? 'default' : keys[0]);
          const steps = (g.pattern?.[variantKey!] ?? []).map((s: Pattern) => ({ ...s }));
          onStartCopy(`${g.name} - Copy`, steps, g.reloadTimeSeconds);
        }}
        listMode
      />
    </div>
  );
}


