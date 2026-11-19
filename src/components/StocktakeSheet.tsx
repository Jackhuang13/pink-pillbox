import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Medication } from '../core/types';
import {
  computeAdjustmentForTarget,
  fmt,
  formatPackAmount,
  getStatus,
  splitPacks
} from '../domain/calc';
import type { I18nKey } from '../i18n';
import { useApp } from '../store';
import { PillAvatar } from './PillAvatar';

interface Props {
  med: Medication;
  today: Date;
  onApply: (stockAdjustment: number) => void;
  onReset: () => void;
  onClose: () => void;
}

const parseNum = (s: string): number => {
  if (s.trim() === '') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

export function StocktakeSheet({ med, today, onApply, onReset, onClose }: Props) {
  const { t, lang } = useApp();
  const unit = t(`unit_${med.unit}` as I18nKey);
  const packUnit =
    med.unit === 'ml' || med.unit === 'drop' ? t('packUnit_bottle') : t('packUnit_box');
  const spaced = lang === 'en';
  const hasPackSize = med.unitsPerPack > 0;

  const currentStatus = useMemo(() => getStatus(med, today), [med, today]);
  const [includeToday, setIncludeToday] = useState(true);

  const initialSplit = splitPacks(currentStatus.remainingWithToday, med.unitsPerPack);
  const [packsInput, setPacksInput] = useState(() => (hasPackSize ? String(initialSplit.packs) : '0'));
  const [looseInput, setLooseInput] = useState(() => fmt(initialSplit.loose));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const switchBasis = (nextIncludeToday: boolean) => {
    setIncludeToday(nextIncludeToday);
    const baseAmt = nextIncludeToday
      ? currentStatus.remainingWithToday
      : currentStatus.remainingAfterToday;
    const sp = splitPacks(baseAmt, med.unitsPerPack);
    setPacksInput(hasPackSize ? String(sp.packs) : '0');
    setLooseInput(fmt(sp.loose));
    setError(null);
  };

  const pVal = hasPackSize ? parseNum(packsInput) : 0;
  const lVal = parseNum(looseInput);
  const valid = Number.isFinite(pVal) && Number.isFinite(lVal) && pVal >= 0 && lVal >= 0;
  const countedUnits = valid ? pVal * (hasPackSize ? med.unitsPerPack : 0) + lVal : 0;

  const previewAdj = useMemo(
    () => (valid ? computeAdjustmentForTarget(med, today, countedUnits, includeToday) : 0),
    [valid, med, today, countedUnits, includeToday]
  );

  const previewStatus = useMemo(
    () => getStatus({ ...med, stockAdjustment: previewAdj }, today),
    [med, previewAdj, today]
  );

  const previewText = formatPackAmount(
    previewStatus.remainingWithToday,
    med.unitsPerPack,
    packUnit,
    unit,
    spaced
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setError(t('stocktakeErrInvalid'));
      return;
    }
    setError(null);
    onApply(previewAdj);
  };

  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${t('stocktakeTitle')} - ${med.name}`}
      >
        <div className="sheet__handle" aria-hidden="true" />
        <div className="sheet__header">
          <PillAvatar icon={med.icon} seed={med.name || med.id} size={44} />
          <div className="sheet__titles">
            <h2 className="sheet__title">{t('stocktakeTitle')}</h2>
            <div className="sheet__med-name">{med.name}</div>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('cancel')}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form className="sheet__form" onSubmit={handleSubmit} noValidate>
          {currentStatus.daily > 0 && currentStatus.state !== 'future' && (
            <div className="field">
              <span className="field__label">{t('stocktakeBasisLabel')}</span>
              <div className="sheet__seg" role="group" aria-label={t('stocktakeBasisLabel')}>
                <button
                  type="button"
                  className={`sheet__seg-btn${includeToday ? ' is-active' : ''}`}
                  aria-pressed={includeToday}
                  onClick={() => switchBasis(true)}
                >
                  {t('stocktakeBeforeToday')}
                </button>
                <button
                  type="button"
                  className={`sheet__seg-btn${!includeToday ? ' is-active' : ''}`}
                  aria-pressed={!includeToday}
                  onClick={() => switchBasis(false)}
                >
                  {t('stocktakeAfterToday')}
                </button>
              </div>
            </div>
          )}

          <div className={hasPackSize ? 'field-row' : 'field'}>
            {hasPackSize && (
              <label className="field">
                <span className="field__label">
                  {t('stocktakePacksLabel', { packUnit })}
                </span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={packsInput}
                  onChange={(e) => setPacksInput(e.target.value)}
                />
              </label>
            )}
            <label className="field">
              <span className="field__label">
                {t('stocktakeLooseLabel', { unit })}
              </span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.25"
                inputMode="decimal"
                value={looseInput}
                onChange={(e) => setLooseInput(e.target.value)}
              />
            </label>
          </div>

          <div className="sheet__preview">
            <span>{t('stocktakePreview')}</span>
            <strong className="tabular-nums">
              {valid ? previewText : '—'}
              {valid && previewStatus.daysRemaining !== null
                ? ` · ${previewStatus.daysRemaining} ${t('daysUnit')}`
                : ''}
            </strong>
          </div>

          {error && <div className="error-box">⚠️ {error}</div>}

          <div className="sheet__actions">
            {currentStatus.adjustment !== 0 && (
              <button
                type="button"
                className="btn btn--ghost sheet__reset"
                onClick={onReset}
              >
                {t('stocktakeReset')}
              </button>
            )}
            <div className="sheet__actions-row">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                {t('cancel')}
              </button>
              <button type="submit" className="btn btn--primary">
                {t('stocktakeApply')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
