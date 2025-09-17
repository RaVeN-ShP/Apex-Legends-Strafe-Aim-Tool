"use client";

import { Gun, Pattern } from "@/features/guns/types/gun";
import GunSelector from "@/features/guns/components/GunSelector";
import { useI18n } from "@/i18n/I18nProvider";
import { useHapticFeedback } from "@/shared/hooks/useHapticFeedback";

export default function GunsSidebar({
  guns,
  selectedGun,
  selectedPatternKey,
  onSelectGun,
  onStartCreate,
  onStartEdit,
  onDeleteProfile,
  selectionMode,
  highlightGunIdA,
  highlightGunIdB,
}: {
  guns: Gun[];
  selectedGun: Gun | null;
  selectedPatternKey: string | null;
  onSelectGun: (gun: Gun | null, side?: 'A' | 'B') => void;
  onStartCreate: () => void;
  onStartEdit: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
  selectionMode?: 'A' | 'B' | 'AB';
  highlightGunIdA?: string | null;
  highlightGunIdB?: string | null;
}) {
  const { t } = useI18n();
  const triggerHaptic = useHapticFeedback({ duration: 'light' });

  return (
    <div>
      <div className="mb-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            onStartCreate();
          }}
          className="w-full text-sm font-semibold px-3 py-2 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white"
        >
          {t('custom.createTop', { defaultValue: 'Create Custom' })}
        </button>
      </div>
      <GunSelector
        guns={guns}
        selectedGun={selectedGun}
        onGunSelect={(g, side) => { onSelectGun(g, side); }}
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
        listMode
      />
    </div>
  );
}


