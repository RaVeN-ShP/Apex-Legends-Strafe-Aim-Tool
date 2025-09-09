"use client";

import { useEffect, useMemo, useState } from "react";
import { Gun, Pattern } from "@/features/guns/types/gun";
import { guns as builtInGuns } from "@/features/guns/data/guns";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/shared/components/LanguageSwitcher";
import GunSelector from "@/features/guns/components/GunSelector";
import PatternModeSwitcher from "@/features/patterns/components/PatternModeSwitcher";
import StrafeTimer from "@/features/timer/components/StrafeTimer";
import { useCustomProfiles } from "@/features/customProfiles/useCustomProfiles";
import Link from "next/link";

export default function AdvancedPage() {
  const { t } = useI18n();
  const { gunsFromProfiles } = useCustomProfiles();
  const [volume, setVolume] = useState(0.8);

  const allGuns: Gun[] = useMemo(() => {
    return [
      ...gunsFromProfiles,
      ...builtInGuns,
    ];
  }, [gunsFromProfiles]);

  const [gunA, setGunA] = useState<Gun | null>(allGuns[0] ?? null);
  const [gunB, setGunB] = useState<Gun | null>(allGuns[1] ?? null);
  const [modeA, setModeA] = useState<string | null>(null);
  const [modeB, setModeB] = useState<string | null>(null);

  // Initialize/maintain selected pattern variants for A
  useEffect(() => {
    if (!gunA) { setModeA(null); return; }
    const keys = Object.keys(gunA.pattern ?? {});
    if (keys.length <= 1) { setModeA(keys[0] ?? "default"); return; }
    setModeA((prev) => (prev && keys.includes(prev)) ? prev : (keys.includes("default") ? "default" : keys[0]));
  }, [gunA]);

  // Initialize/maintain selected pattern variants for B
  useEffect(() => {
    if (!gunB) { setModeB(null); return; }
    const keys = Object.keys(gunB.pattern ?? {});
    if (keys.length <= 1) { setModeB(keys[0] ?? "default"); return; }
    setModeB((prev) => (prev && keys.includes(prev)) ? prev : (keys.includes("default") ? "default" : keys[0]));
  }, [gunB]);

  const patternA: Pattern[] = useMemo(() => {
    if (!gunA) return [];
    const m = modeA ?? (Object.keys(gunA.pattern ?? {})[0] ?? "default");
    return (gunA.pattern?.[m] ?? []);
  }, [gunA, modeA]);

  const patternB: Pattern[] = useMemo(() => {
    if (!gunB) return [];
    const m = modeB ?? (Object.keys(gunB.pattern ?? {})[0] ?? "default");
    return (gunB.pattern?.[m] ?? []);
  }, [gunB, modeB]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 py-6 px-4 text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {t('advanced.title', { defaultValue: 'Advanced Mode' })}
              </h1>
              <p className="text-white/80 mt-2 text-sm md:text-base">
                {t('advanced.subtitle', { defaultValue: 'Combine timelines from two weapons for expert practice.' })}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
                <LanguageSwitcher />
              </div>
              <Link href="/" className="inline-flex items-center rounded-md border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-sm">
                {t('nav.backHome', { defaultValue: 'Back to main' })}
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gun A selector */}
          <section className="rounded-xl border border-white/10 bg-black/20 p-4 md:p-6">
            <div className="mb-4 text-sm font-semibold text-white/80">{t('advanced.gunA', { defaultValue: 'Weapon A' })}</div>
            <GunSelector guns={allGuns} selectedGun={gunA} onGunSelect={(g) => setGunA(g)} />
            {gunA && (
              <div className="mt-4">
                <PatternModeSwitcher patternMap={gunA.pattern} selectedKey={modeA} onSelect={(k) => setModeA(k)} />
              </div>
            )}
          </section>

          {/* Gun B selector */}
          <section className="rounded-xl border border-white/10 bg-black/20 p-4 md:p-6">
            <div className="mb-4 text-sm font-semibold text-white/80">{t('advanced.gunB', { defaultValue: 'Weapon B' })}</div>
            <GunSelector guns={allGuns} selectedGun={gunB} onGunSelect={(g) => setGunB(g)} />
            {gunB && (
              <div className="mt-4">
                <PatternModeSwitcher patternMap={gunB.pattern} selectedKey={modeB} onSelect={(k) => setModeB(k)} />
              </div>
            )}
          </section>
        </div>

        {/* Combined timer */}
        <section className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 md:p-6">
          {gunA && gunB ? (
            <StrafeTimer
              gun={gunA}
              pattern={patternA}
              volume={volume}
              onVolumeChange={setVolume}
              resetToken={`${gunA.id}-${modeA}-${gunB.id}-${modeB}`}
              dual
              gunB={gunB}
              patternB={patternB}
            />
          ) : (
            <div className="text-white/70 text-sm">
              {t('advanced.selectBoth', { defaultValue: 'Select both Weapon A and Weapon B to begin.' })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}


