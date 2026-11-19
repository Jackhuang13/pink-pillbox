import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { PillAvatar } from '../components/PillAvatar';
import { EventBus } from '../core/EventBus';
import type { Medication, Unit } from '../core/types';
import { dailyDose, fmt, getStatus, startOfToday, toYMD, totalUnits } from '../domain/calc';
import type { FrequencyCode } from '../domain/frequency';
import { FREQUENCIES, FREQUENCY_CODES } from '../domain/frequency';
import type { MedIconId } from '../domain/icons';
import { defaultIconForUnit, MED_ICON_IDS, MED_ICONS, resolveMedIcon } from '../domain/icons';
import { useObjectUrl } from '../hooks';
import type { I18nKey } from '../i18n';
import { fileToScaledBlob } from '../image';
import { useApp } from '../store';

const UNITS: Unit[] = ['tablet', 'capsule', 'ml', 'drop', 'pack'];

interface Draft {
  name: string;
  code: string;
  icon: MedIconId;
  freq: FrequencyCode;
  customTimes: string;
  dose: string;
  unit: Unit;
  packs: string;
  perPack: string;
  loose: string;
  startDate: string;
  notes: string;
}

const num = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AddMedPage({ editId }: { editId?: string }) {
  const { meds, t, lang, saveMed } = useApp();
  const existing = meds.find((m) => m.id === editId);

  const [draft, setDraft] = useState<Draft>(() =>
    existing
      ? {
          name: existing.name,
          code: existing.code,
          icon: resolveMedIcon(existing.icon),
          freq: existing.freq,
          customTimes: existing.customTimesPerDay != null ? String(existing.customTimesPerDay) : '',
          dose: String(existing.dosePerIntake),
          unit: existing.unit,
          packs: String(existing.packCount),
          perPack: String(existing.unitsPerPack),
          loose: String(existing.looseCount),
          startDate: existing.startDate,
          notes: existing.notes ?? ''
        }
      : {
          name: '',
          code: '',
          icon: defaultIconForUnit('tablet'),
          freq: 'QD',
          customTimes: '',
          dose: '1',
          unit: 'tablet',
          packs: '1',
          perPack: '28',
          loose: '0',
          startDate: toYMD(new Date()),
          notes: ''
        }
  );
  const [iconTouched, setIconTouched] = useState<boolean>(() => Boolean(existing));
  const [newImage, setNewImage] = useState<Blob | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const existingUrl = useObjectUrl(!imageRemoved && !newImage ? existing?.imageId : undefined);
  const [newUrl, setNewUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!newImage) {
      setNewUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(newImage);
    setNewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [newImage]);
  const previewUrl = newUrl ?? existingUrl;

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const draftMed: Medication = useMemo(
    () => ({
      id: existing?.id ?? 'draft',
      createdAt: existing?.createdAt ?? 0,
      name: draft.name,
      code: draft.code,
      icon: draft.icon,
      freq: draft.freq,
      customTimesPerDay: draft.freq === 'CUSTOM' ? num(draft.customTimes) : undefined,
      dosePerIntake: num(draft.dose),
      unit: draft.unit,
      packCount: num(draft.packs),
      unitsPerPack: num(draft.perPack),
      looseCount: num(draft.loose),
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(draft.startDate) ? draft.startDate : toYMD(new Date()),
      notes: draft.notes || undefined
    }),
    [draft, existing]
  );

  const daily = dailyDose(draftMed);
  const total = totalUnits(draftMed);
  const status = getStatus(draftMed, startOfToday());
  const unitText = t(`unit_${draft.unit}` as I18nKey);

  const onPickImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const blob = await fileToScaledBlob(file);
    setNewImage(blob);
    setImageRemoved(false);
  };

  const validate = (): string | null => {
    if (!draft.name.trim()) return t('errName');
    if (num(draft.dose) <= 0) return t('errDose');
    if (draft.freq === 'CUSTOM' && num(draft.customTimes) <= 0) return t('errTimes');
    if (num(draft.packs) > 0 && num(draft.perPack) <= 0) return t('errPack');
    if (total <= 0) return t('errTotal');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate)) return t('errDate');
    return null;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);
    const scheduleOrStockChanged = Boolean(
      existing &&
        (existing.freq !== draftMed.freq ||
          existing.customTimesPerDay !== draftMed.customTimesPerDay ||
          existing.dosePerIntake !== draftMed.dosePerIntake ||
          existing.packCount !== draftMed.packCount ||
          existing.unitsPerPack !== draftMed.unitsPerPack ||
          existing.looseCount !== draftMed.looseCount ||
          existing.startDate !== draftMed.startDate)
    );
    const med: Medication = {
      ...draftMed,
      id: existing?.id ?? uid(),
      createdAt: existing?.createdAt ?? Date.now(),
      name: draft.name.trim(),
      code: draft.code.trim(),
      imageId: imageRemoved ? undefined : existing?.imageId,
      stockAdjustment: scheduleOrStockChanged ? undefined : existing?.stockAdjustment
    };
    try {
      await saveMed(med, newImage ?? (imageRemoved ? null : undefined));
      EventBus.emit('ui:toast', { key: 'saved' });
      EventBus.emit('ui:navigate', { name: 'home' });
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="page-title">{existing ? `✏️ ${t('editMed')}` : `🌷 ${t('addMed')}`}</h1>
      </header>

      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <span className="field__label">📷 {t('image')}（{t('optional')}）</span>
          <div className="img-picker">
            <label className="img-picker__preview">
              {previewUrl ? (
                <img src={previewUrl} alt="" className="thumb thumb--lg" />
              ) : (
                <PillAvatar icon={draft.icon} seed={draft.name || 'pillpal'} size={88} />
              )}
              <input type="file" accept="image/*" className="visually-hidden" onChange={onPickImage} />
              <span className="img-picker__hint">
                {previewUrl ? t('changeImage') : t('tapToUpload')}
              </span>
            </label>
            {previewUrl && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setNewImage(null);
                  setImageRemoved(true);
                }}
              >
                {t('removeImage')}
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <span className="field__label">🎀 {t('iconPickerLabel')}</span>
          <p className="field__hint">{t('iconPickerHint')}</p>
          <div className="icon-grid" role="group" aria-label={t('iconPickerLabel')}>
            {MED_ICON_IDS.map((id) => {
              const active = draft.icon === id;
              return (
                <button
                  key={id}
                  type="button"
                  className={`icon-option${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => {
                    setIconTouched(true);
                    set({ icon: id });
                  }}
                >
                  <PillAvatar icon={id} size={46} />
                  <span className="icon-option__label">{MED_ICONS[id][lang]}</span>
                  {active && <span className="icon-option__check" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        <label className="field">
          <span className="field__label">💊 {t('name')} *</span>
          <input
            className="input"
            value={draft.name}
            placeholder={t('namePlaceholder')}
            onChange={(e) => set({ name: e.target.value })}
          />
        </label>

        <label className="field">
          <span className="field__label">🏷️ {t('drugCode')}（{t('optional')}）</span>
          <input
            className="input"
            value={draft.code}
            placeholder={t('drugCodePlaceholder')}
            onChange={(e) => set({ code: e.target.value })}
          />
        </label>

        <div className="field">
          <label className="field__label" htmlFor="freq-select">⏰ {t('frequency')}</label>
          <select
            id="freq-select"
            className="select"
            value={draft.freq}
            onChange={(e) => set({ freq: e.target.value as FrequencyCode })}
          >
            {FREQUENCY_CODES.map((code) => (
              <option key={code} value={code}>
                {code === 'CUSTOM' ? t('custom') : `${code}｜${FREQUENCIES[code][lang]}`}
              </option>
            ))}
          </select>
          {draft.freq === 'PRN' && <p className="field__hint">{t('prnHint')}</p>}
        </div>

        {draft.freq === 'CUSTOM' && (
          <label className="field">
            <span className="field__label">🔢 {t('customTimesPerDay')}</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              value={draft.customTimes}
              onChange={(e) => set({ customTimes: e.target.value })}
            />
          </label>
        )}

        <div className="field-row">
          <label className="field">
            <span className="field__label">🥄 {t('dosePerIntake')}</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.25"
              inputMode="decimal"
              value={draft.dose}
              onChange={(e) => set({ dose: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">📦 {t('unitLabel')}</span>
            <select
              className="select"
              value={draft.unit}
              onChange={(e) => {
                const nextUnit = e.target.value as Unit;
                set(
                  iconTouched
                    ? { unit: nextUnit }
                    : { unit: nextUnit, icon: defaultIconForUnit(nextUnit) }
                );
              }}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{t(`unit_${u}` as I18nKey)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span className="field__label">🎁 {t('packCount')}</span>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={draft.packs}
              onChange={(e) => set({ packs: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">🧮 {t('unitsPerPack')}</span>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={draft.perPack}
              placeholder={t('unitsPerPackPlaceholder')}
              onChange={(e) => set({ perPack: e.target.value })}
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span className="field__label">🍬 {t('looseCount')}</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              value={draft.loose}
              onChange={(e) => set({ loose: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">📅 {t('startDate')}</span>
            <input
              className="input"
              type="date"
              value={draft.startDate}
              onChange={(e) => set({ startDate: e.target.value })}
            />
          </label>
        </div>

        <label className="field">
          <span className="field__label">📝 {t('notes')}（{t('optional')}）</span>
          <textarea
            className="textarea"
            rows={2}
            value={draft.notes}
            placeholder={t('notesPlaceholder')}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </label>

        <div className="preview-card">
          <div className="preview-card__title">{t('previewTitle')}</div>
          <div>
            {t('dailyDoseLabel')}：<b>{fmt(daily)}</b> {unitText}{t('perDay')}
          </div>
          <div>
            {t('totalLabel')}：<b>{fmt(total)}</b> {unitText}
            （{fmt(num(draft.packs))} × {fmt(num(draft.perPack))} + {fmt(num(draft.loose))}）
          </div>
          <div>
            {t('daysLabel')}：<b>{status.daysRemaining ?? '—'}</b>
            {status.daysRemaining !== null ? ` ${t('daysUnit')}` : ''}
            {status.runOutDate ? `・${t('runOut', { date: status.runOutDate })}` : ''}
          </div>
        </div>

        {error && <div className="error-box">⚠️ {error}</div>}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => EventBus.emit('ui:navigate', { name: 'home' })}
          >
            {t('cancel')}
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
