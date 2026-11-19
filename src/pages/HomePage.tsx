import { useEffect, useMemo, useRef, useState } from 'react';
import { MedCard } from '../components/MedCard';
import { PhaserGame } from '../components/PhaserGame';
import { PillAvatar } from '../components/PillAvatar';
import { StocktakeSheet } from '../components/StocktakeSheet';
import { EventBus } from '../core/EventBus';
import type { Medication } from '../core/types';
import type { MedState } from '../domain/calc';
import { computeAdjustmentForDelta, fmt, getStatus } from '../domain/calc';
import { resolveMedIcon } from '../domain/icons';
import type { SyncPayload } from '../game/types';
import { useToday } from '../hooks';
import type { I18nKey } from '../i18n';
import { useApp } from '../store';

const RANK: Record<MedState, number> = { empty: 0, low: 1, ok: 2, prn: 3, future: 4 };

export function HomePage() {
  const { meds, t, removeMed, setMedAdjustment } = useApp();
  const today = useToday();
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [calibratingId, setCalibratingId] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const syncRef = useRef<SyncPayload>({ meds: [] });

  const items = useMemo(
    () =>
      meds
        .map((med) => ({ med, status: getStatus(med, today) }))
        .sort(
          (a, b) =>
            RANK[a.status.state] - RANK[b.status.state] ||
            (a.status.daysRemaining ?? 9999) - (b.status.daysRemaining ?? 9999) ||
            a.med.createdAt - b.med.createdAt
        ),
    [meds, today]
  );

  const lowCount = items.filter((i) => i.status.state === 'low' || i.status.state === 'empty').length;
  const calibratingMed = meds.find((m) => m.id === calibratingId) ?? null;

  // React → Phaser：同步場景精靈（上架/更新狀態與劑型圖示/下架）
  const payload = useMemo<SyncPayload>(
    () => ({
      meds: items.map(({ med, status }) => ({
        id: med.id,
        name: med.name,
        icon: resolveMedIcon(med.icon),
        state: status.state,
        daysRemaining: status.daysRemaining
      }))
    }),
    [items]
  );
  syncRef.current = payload;

  useEffect(() => {
    EventBus.emit('meds:sync', payload);
  }, [payload]);

  // Phaser → React：場景就緒重送同步；點藥丸 → 卡片定位＋閃現
  useEffect(() => {
    const onReady = () => EventBus.emit('meds:sync', syncRef.current);
    const onSelected = (id: string) => {
      setHighlightId(id);
      cardRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    EventBus.on('scene:ready', onReady);
    EventBus.on('med:selected', onSelected);
    return () => {
      EventBus.off('scene:ready', onReady);
      EventBus.off('med:selected', onSelected);
    };
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const id = window.setTimeout(() => setHighlightId(null), 1800);
    return () => window.clearTimeout(id);
  }, [highlightId]);

  const onMissed = (med: Medication) => {
    const nextAdj = computeAdjustmentForDelta(med, today, med.dosePerIntake);
    setMedAdjustment(med.id, nextAdj);
    const unit = t(`unit_${med.unit}` as I18nKey);
    EventBus.emit('ui:toast', {
      key: 'missedDoseToast',
      vars: { dose: fmt(med.dosePerIntake), unit }
    });
  };

  const onExtra = (med: Medication) => {
    const nextAdj = computeAdjustmentForDelta(med, today, -med.dosePerIntake);
    setMedAdjustment(med.id, nextAdj);
    const unit = t(`unit_${med.unit}` as I18nKey);
    EventBus.emit('ui:toast', {
      key: 'extraDoseReminder',
      vars: { dose: fmt(med.dosePerIntake), unit },
      tone: 'warn'
    });
  };

  const onDelete = async (id: string) => {
    if (calibratingId === id) setCalibratingId(null);
    await removeMed(id);
    EventBus.emit('ui:toast', { key: 'deleted' });
  };

  return (
    <div className="page">
      <header className="header">
        <div className="header__titles">
          <h1 className="app-title">🌸 {t('appTitle')}</h1>
          <p className="app-subtitle">{t('appSubtitle')}</p>
        </div>
        <button
          type="button"
          className="icon-btn icon-btn--lg"
          aria-label={t('settings')}
          onClick={() => EventBus.emit('ui:navigate', { name: 'settings' })}
        >
          ⚙️
        </button>
      </header>

      <PhaserGame />
      <p className="scene-hint">👆 {t('sceneHint')}</p>

      {items.length > 0 && (
        <div className="summary">
          <span className="chip">💊 {t('summaryTotal', { n: items.length })}</span>
          {lowCount > 0 ? (
            <span className="chip chip--warn">🍓 {t('summaryLow', { n: lowCount })}</span>
          ) : (
            <span className="chip chip--good">✨ {t('summaryAllGood')}</span>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty">
          <PillAvatar icon="capsule" seed="pillpal" size={120} />
          <h2>{t('emptyTitle')}</h2>
          <p>{t('emptyHint')}</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => EventBus.emit('ui:navigate', { name: 'add' })}
          >
            ＋ {t('addMed')}
          </button>
        </div>
      ) : (
        <div className="med-list">
          {items.map(({ med, status }) => (
            <MedCard
              key={med.id}
              med={med}
              status={status}
              onMissed={onMissed}
              onExtra={onExtra}
              onStocktake={(m) => setCalibratingId(m.id)}
              onDelete={onDelete}
              highlighted={highlightId === med.id}
              innerRef={(el) => {
                if (el) cardRefs.current.set(med.id, el);
                else cardRefs.current.delete(med.id);
              }}
            />
          ))}
        </div>
      )}

      {calibratingMed && (
        <StocktakeSheet
          key={calibratingMed.id}
          med={calibratingMed}
          today={today}
          onApply={(adj) => {
            setMedAdjustment(calibratingMed.id, adj);
            setCalibratingId(null);
            EventBus.emit('ui:toast', { key: 'stocktakeSavedToast' });
          }}
          onReset={() => {
            setMedAdjustment(calibratingMed.id, 0);
            setCalibratingId(null);
            EventBus.emit('ui:toast', { key: 'stocktakeResetToast' });
          }}
          onClose={() => setCalibratingId(null)}
        />
      )}

      <button
        type="button"
        className="fab"
        aria-label={t('addMed')}
        onClick={() => EventBus.emit('ui:navigate', { name: 'add' })}
      >
        ＋
      </button>
    </div>
  );
}
