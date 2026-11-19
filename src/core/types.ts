import type { FrequencyCode } from '../domain/frequency';
import type { MedIconId } from '../domain/icons';

export type Unit = 'tablet' | 'capsule' | 'ml' | 'drop' | 'pack';
export type Lang = 'zh' | 'en';
export type FontName = 'Iansui' | 'Huninn';

export interface Medication {
  id: string;
  code: string;
  name: string;
  icon?: MedIconId;
  imageId?: string;
  freq: FrequencyCode;
  customTimesPerDay?: number;
  dosePerIntake: number;
  unit: Unit;
  packCount: number;
  unitsPerPack: number;
  looseCount: number;
  startDate: string; // YYYY-MM-DD（本地日曆日）
  stockAdjustment?: number; // 累計手動校正差值（漏吃為正、多吃為負）
  notes?: string;
  createdAt: number;
}

export interface Settings {
  lang: Lang;
  font: FontName;
}

export type View =
  | { name: 'home' }
  | { name: 'settings' }
  | { name: 'add'; editId?: string };
