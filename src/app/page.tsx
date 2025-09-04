"use client";

import { useState } from "react";
import { Gun } from "@/types/gun";
import { guns } from "@/data/guns";
import GunSelector from "@/components/GunSelector";
import StrafeTimer from "@/components/StrafeTimer";
import GlobalSettings from "@/components/GlobalSettings";
import PatternVisualizer from "@/components/PatternVisualizer";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Home() {
  const [selectedGun, setSelectedGun] = useState<Gun | null>(guns[0] ?? null);
  const [waitTimeSeconds, setWaitTimeSeconds] = useState(2);
  const [volume, setVolume] = useState(0.8);
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">{t('app.title')}</h1>
              <p className="text-white/80 mt-2 text-sm md:text-base">
            {t('app.subtitle.before')}
            <a href="https://x.com/ahn99fps" target="_blank" rel="noreferrer" className="underline hover:text-white">
              ahn99
            </a>
            {t('app.subtitle.after')}
              </p>
            </div>
            <div className="shrink-0">
              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
          <p className="text-white/60 mt-2 text-xs md:text-sm">
            References: {" "}
            <a href="https://docs.google.com/document/d/1olISc98UQ2ucUlvm3pGEt5sqG7Qf4LC7I2HnmTOB7w4/edit?tab=t.0" target="_blank" rel="noreferrer" className="underline hover:text-white/80">
              {t('refs.doc')}
            </a>{" "}•{" "}
            <a href="https://www.youtube.com/watch?v=fPLSisfQGlE" target="_blank" rel="noreferrer" className="underline hover:text-white/80">
              {t('refs.video')}
            </a>
          </p>
        </header>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
          {/* Left Sidebar */}
          <aside>
            <GunSelector guns={guns} selectedGun={selectedGun} onGunSelect={setSelectedGun} listMode />
            <div className="mt-4">
              <GlobalSettings waitTimeSeconds={waitTimeSeconds} onWaitTimeChange={setWaitTimeSeconds} volume={volume} onVolumeChange={setVolume} />
            </div>
          </aside>

        {/* Main Section */}
          <section className="rounded-xl border border-white/10 bg-black/20 p-4 md:p-6 text-white">
            {selectedGun ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="text-xl font-bold tracking-wide">{selectedGun.name}</div>
                  <div className="text-xs text-white/60">{t('main.pattern')}</div>
                </div>
                <PatternVisualizer gun={selectedGun} />
                <div className="pt-2">
                  <StrafeTimer gun={selectedGun} waitTimeSeconds={waitTimeSeconds} volume={volume} />
                </div>
                
                {/* FAQ Section inside main panel */}
                <div className="pt-4 border-t border-white/10">
                  <h2 className="text-lg font-bold mb-4">{t('faq.title')}</h2>
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-white/90 mb-1 text-sm">{t('faq.q0.question')}</h3>
                      <p className="text-white/70 text-xs">
                        {t('faq.q0.answer')} <a href="https://www.youtube.com/watch?v=fPLSisfQGlE" target="_blank" rel="noreferrer" className="underline hover:text-white/80">YouTube</a>
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white/90 mb-1 text-sm">{t('faq.q1.question')}</h3>
                      <p className="text-white/70 text-xs">{t('faq.q1.answer')}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white/90 mb-1 text-sm">{t('faq.q2.question')}</h3>
                      <p className="text-white/70 text-xs">{t('faq.q2.answer')}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white/90 mb-1 text-sm">{t('faq.q3.question')}</h3>
                      <p className="text-white/70 text-xs">{t('faq.q3.answer')}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white/90 mb-1 text-sm">{t('faq.q4.question')}</h3>
                      <p className="text-white/70 text-xs">{t('faq.q4.answer')}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-white/70">{t('main.selectPrompt')}</div>
            )}
          </section>
        </div>


        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-white/50">
          {t('footer.credit', { name: 'RaVeN_ShP' })}
        </footer>
      </div>
    </main>
  );
}
