import { useEffect, useState } from 'react';
import { EventBus } from '../core/EventBus';
import type { Medication } from '../core/types';
import type { MedStatus } from '../domain/calc';
import { fmt, formatPackAmount, splitPacks } from '../domain/calc';
import { FREQUENCIES, timesPerDay } from '../domain/frequency';
import { useObjectUrl } from '../hooks';
import type { I18nKey } from '../i18n';
import { useApp } from '../store';
import { PillAvatar } from './PillAvatar';

interface Props {
  med: Medication;
  status: MedStatus;
  onMissed: (med: Medication) => void;
  onExtra: (med: Medication) => void;
  onStocktake: (med: Medication) => void;
  onDelete: (id: string) => void;
  highlighted?: boolean;
  innerRef?: (el: HTMLElement | null) => void;
}

export function MedCard({
  med,
  status,
  onMissed,
  onExtra,
  onStocktake,
  onDelete,
  highlighted,
  innerRef
}: Props) {
  const { t, lang } = useApp();
  const url = useObjectUrl(med.imageId);
  const unit = t(`unit_${med.unit}` as I18nKey);
  const packUnit =
    med.unit === 'ml' || med.unit === 'drop' ? t('packUnit_bottle') : t('packUnit_box');
  const spaced = lang === 'en';
  const afterSplit = splitPacks(status.remainingAfterToday, med.unitsPerPack);
  const remainingText = formatPackAmount(
    status.remainingWithToday,
    med.unitsPerPack,
    packUnit,
    unit,
    spaced
  );
  const totalText = formatPackAmount(status.total, med.unitsPerPack, packUnit, unit, spaced);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const id = window.setTimeout(() => setConfirming(false), 4000);
    return () => window.clearTimeout(id);
  }, [confirming]);

  const freqLabel =
    med.freq === 'CUSTOM'
      ? `${t('custom')} ${fmt(timesPerDay(med.freq, med.customTimesPerDay))} ${t('timesPerDaySuffix')}`
      : `${med.freq}｜${FREQUENCIES[med.freq][lang]}`;

  const statusChip =
    status.state === 'low' ? (
      <span className="status-chip status-chip--low">🍓 {t('statusLow')}</span>
    ) : status.state === 'empty' ? (
      <span className="status-chip status-chip--empty">💤 {t('statusEmpty')}</span>
    ) : status.state === 'future' ? (
      <span className="status-chip status-chip--future">🌱 {t('notStarted')}</span>
    ) : status.state === 'prn' ? (
      <span className="status-chip status-chip--prn">🫧 {t('statusPrn')}</span>
    ) : null;

  const adjustmentText =
    status.adjustment !== 0
      ? t('adjustedNote', {
          delta: `${status.adjustment > 0 ? '+' : ''}${fmt(status.adjustment)}`,
          unit
        })
      : null;

  return (
    <article
      ref={innerRef}
      className={`med-card med-card--${status.state}${highlighted ? ' med-card--highlight' : ''}`}
    >
      <div className="med-card__top">
        {url ? (
          <img className="thumb" src={url} alt={med.name} />
        ) : (
          <PillAvatar icon={med.icon} seed={med.name || med.id} size={56} />
        )}
        <div className="med-card__titles">
          <h3 className="med-card__name">{med.name}</h3>
          {med.code && <span className="code-chip">#{med.code}</span>}
        </div>
        <div className="med-card__actions">
          {confirming ? (
            <div className="confirm-inline" role="group" aria-label={t('confirmDelete', { name: med.name })}>
              <span>{t('confirmDeleteShort')}</span>
              <button
                type="button"
                className="confirm-inline__btn confirm-inline__btn--yes"
                aria-label={t('delete')}
                onClick={() => onDelete(med.id)}
              >
                ✓
              </button>
              <button
                type="button"
                className="confirm-inline__btn confirm-inline__btn--no"
                aria-label={t('cancel')}
                onClick={() => setConfirming(false)}
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('edit')}
                onClick={() => EventBus.emit('ui:navigate', { name: 'add', editId: med.id })}
              >
                ✏️
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('delete')}
                onClick={() => setConfirming(true)}
              >
                🗑️
              </button>
            </>
          )}
        </div>
      </div>

      <div className="badges">
        <span className="badge badge--freq">💊 {freqLabel}</span>
        <span className="badge">🥄 {t('perIntake')} {fmt(med.dosePerIntake)} {unit}</span>
        <span className="badge">📅 {t('startsOn', { date: med.startDate })}</span>
      </div>

      <div className="days-row">
        <div>
          <div className="days-label">{t('remainingDaysLabel')}</div>
          <div className="days-num tabular-nums">
            {status.daysRemaining ?? '—'}
            <span className="days-unit">{status.daysRemaining !== null ? t('daysUnit') : ''}</span>
          </div>
        </div>
        <div className="days-side">
          {statusChip}
          {status.runOutDate && <div className="runout">{t('runOut', { date: status.runOutDate })}</div>}
          {status.state === 'prn' && <div className="runout">{t('prnHint')}</div>}
        </div>
      </div>

      {/* 需求核心：剩餘餘量 = 今日用量 + 扣除一天之餘量，分開顯示 */}
      <div className="split">
        <div className="split__box">
          <div className="split__label">🌞 {t('todayDoseLabel')}</div>
          <div className="split__value tabular-nums">
            {fmt(status.todayDose)}
            <small>{unit}</small>
          </div>
        </div>
        <div className="split__box">
          <div className="split__label">🎀 {t('afterTodayLabel')}</div>
          <div className="split__value split__value--pack tabular-nums">
            {afterSplit.packs > 0 ? (
              <>
                <span>
                  {afterSplit.packs}
                  <small>{packUnit}</small>
                </span>
                {afterSplit.loose > 0 && (
                  <>
                    <span className="split__plus">+</span>
                    <span>
                      {fmt(afterSplit.loose)}
                      <small>{unit}</small>
                    </span>
                  </>
                )}
              </>
            ) : (
              <span>
                {fmt(afterSplit.loose)}
                <small>{unit}</small>
              </span>
            )}
          </div>
          {afterSplit.packs > 0 && (
            <div className="split__sub tabular-nums">
              {t('totalUnitsNote', { n: fmt(status.remainingAfterToday), unit })}
            </div>
          )}
        </div>
      </div>

      <div className="total-line tabular-nums">
        {t('totalRemainingLabel')} {remainingText} {t('totalOf', { total: totalText })}
        {adjustmentText && <span className="adjusted-note"> · {adjustmentText}</span>}
      </div>
      <div className="progress">
        <div className="progress__fill" style={{ width: `${(status.usedRatio * 100).toFixed(1)}%` }} />
      </div>

      {/* 忘吃／多吃快速加減與盤點校正 */}
      <div className="med-card__adjust" role="group" aria-label={t('stocktakeTitle')}>
        <button
          type="button"
          className="adjust-btn adjust-btn--missed"
          onClick={() => onMissed(med)}
        >
          {t('missedDoseBtn')}
        </button>
        <button
          type="button"
          className="adjust-btn adjust-btn--extra"
          disabled={status.remainingWithToday <= 1e-9}
          onClick={() => onExtra(med)}
        >
          {t('extraDoseBtn')}
        </button>
        <button
          type="button"
          className="adjust-btn adjust-btn--count"
          onClick={() => onStocktake(med)}
        >
          {t('stocktakeBtn')}
        </button>
      </div>

      {med.notes && <p className="med-notes">📝 {med.notes}</p>}
    </article>
  );
}
