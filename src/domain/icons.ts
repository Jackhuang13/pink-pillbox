import type { Unit } from '../core/types';

export const MED_ICONS = {
  capsule: { zh: '微笑膠囊', en: 'Capsule', bg: '#ffd6e7' },
  tablet: { zh: '奶油圓錠', en: 'Tablet', bg: '#ffe9c7' },
  heart_pill: { zh: '愛心糖衣', en: 'Heart Pill', bg: '#ffd9e6' },
  syrup: { zh: '草莓藥水', en: 'Syrup', bg: '#ffe0ea' },
  dropper: { zh: '薄荷滴管', en: 'Dropper', bg: '#d9f2e3' },
  sachet: { zh: '薰衣草藥包', en: 'Sachet', bg: '#e6ddff' },
  inhaler: { zh: '雲朵噴霧', en: 'Inhaler', bg: '#d7ecff' },
  ointment: { zh: '蜜桃軟膏', en: 'Ointment', bg: '#ffe5d4' }
} as const;

export type MedIconId = keyof typeof MED_ICONS;

export const MED_ICON_IDS = Object.keys(MED_ICONS) as MedIconId[];

export function isMedIconId(value: unknown): value is MedIconId {
  return typeof value === 'string' && value in MED_ICONS;
}

export function resolveMedIcon(icon?: MedIconId): MedIconId {
  return isMedIconId(icon) ? icon : 'capsule';
}

export function defaultIconForUnit(unit: Unit): MedIconId {
  switch (unit) {
    case 'tablet':
      return 'tablet';
    case 'capsule':
      return 'capsule';
    case 'ml':
      return 'syrup';
    case 'drop':
      return 'dropper';
    case 'pack':
      return 'sachet';
  }
}
