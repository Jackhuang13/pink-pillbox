import { useEffect, useState } from 'react';
import { EventBus } from '../core/EventBus';
import type { FontName, Lang } from '../core/types';
import { isInstallable, isIOS, isStandalone, promptInstall } from '../pwa';
import { useApp } from '../store';

const FONTS: { name: FontName; descKey: 'fontIansuiDesc' | 'fontHuninnDesc' }[] = [
  { name: 'Huninn', descKey: 'fontHuninnDesc' },
  { name: 'Iansui', descKey: 'fontIansuiDesc' }
];

const LANGS: { value: Lang; label: string }[] = [
  { value: 'zh', label: '繁體中文' },
  { value: 'en', label: 'English' }
];

export function SettingsPage() {
  const { settings, setSettings, t } = useApp();
  const [installable, setInstallable] = useState(isInstallable());
  const standalone = isStandalone();
  const ios = isIOS();

  useEffect(() => {
    const onInstallable = (v: boolean) => setInstallable(v);
    EventBus.on('pwa:installable', onInstallable);
    return () => {
      EventBus.off('pwa:installable', onInstallable);
    };
  }, []);

  return (
    <div className="page">
      <header className="header">
        <button
          type="button"
          className="back-btn"
          onClick={() => EventBus.emit('ui:navigate', { name: 'home' })}
        >
          ← {t('back')}
        </button>
        <h1 className="page-title">⚙️ {t('settings')}</h1>
      </header>

      <section className="settings-section">
        <h2 className="section-title">🌐 {t('languageLabel')}</h2>
        <div className="pill-group">
          {LANGS.map((l) => (
            <button
              key={l.value}
              type="button"
              className={`pill-option ${settings.lang === l.value ? 'is-active' : ''}`}
              aria-pressed={settings.lang === l.value}
              onClick={() => setSettings({ lang: l.value })}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-title">🎀 {t('fontLabel')}</h2>
        {FONTS.map((f) => (
          <button
            key={f.name}
            type="button"
            className={`font-card ${settings.font === f.name ? 'is-active' : ''}`}
            aria-pressed={settings.font === f.name}
            onClick={() => setSettings({ font: f.name })}
          >
            <span className="font-card__sample" style={{ fontFamily: `'${f.name}', sans-serif` }}>
              {t('fontPreviewText')}
            </span>
            <span className="font-card__name">{f.name}</span>
            <span className="font-card__desc">{t(f.descKey)}</span>
            {settings.font === f.name && <span className="font-card__check">✓</span>}
          </button>
        ))}
      </section>

      <section className="settings-section">
        <h2 className="section-title">📲 {t('installTitle')}</h2>
        {standalone ? (
          <p className="field__hint">{t('installAlreadyStandalone')}</p>
        ) : installable ? (
          <button type="button" className="btn btn--primary" onClick={() => void promptInstall()}>
            {t('installBtn')}
          </button>
        ) : (
          <p className="field__hint">{ios ? t('installHintIos') : t('installHintInstalled')}</p>
        )}
        {!standalone && !ios && <p className="field__hint">{t('installHintIos')}</p>}
      </section>

      <section className="settings-section about">
        <h2 className="section-title">💌 {t('aboutTitle')}</h2>
        <p>{t('aboutText')}</p>
        <p className="field__hint">{t('version')} 2.0.0 ・ Phaser + React + Vite + PWA</p>
      </section>
    </div>
  );
}
