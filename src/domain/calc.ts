import type { Medication } from '../core/types';
import { timesPerDay } from './frequency';

export const DAY_MS = 86_400_000;
export const LOW_STOCK_DAYS = 3;

export function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function toYMD(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function diffDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function fmt(n: number): string {
  return String(Number(n.toFixed(2)));
}

export function dailyDose(m: Medication): number {
  return timesPerDay(m.freq, m.customTimesPerDay) * m.dosePerIntake;
}

export function totalUnits(m: Medication): number {
  return m.packCount * m.unitsPerPack + m.looseCount;
}

export interface PackBreakdown {
  packs: number;
  loose: number;
}

/** 將數量拆分為「完整包裝數 + 散裝數」（避免浮點誤差） */
export function splitPacks(amount: number, unitsPerPack: number): PackBreakdown {
  const rounded = Math.max(0, Number(amount.toFixed(2)));
  if (!Number.isFinite(unitsPerPack) || unitsPerPack <= 0) {
    return { packs: 0, loose: rounded };
  }
  const packs = Math.floor((rounded + 1e-9) / unitsPerPack);
  const rawLoose = rounded - packs * unitsPerPack;
  const loose = rawLoose <= 1e-9 ? 0 : Number(rawLoose.toFixed(2));
  return { packs, loose };
}

/** 格式化為「完整包裝 + 散裝單位」，例如 2盒+7錠 / 2盒 / 7錠 */
export function formatPackAmount(
  amount: number,
  unitsPerPack: number,
  packUnit: string,
  unit: string,
  spaced = false
): string {
  const { packs, loose } = splitPacks(amount, unitsPerPack);
  const sp = spaced ? ' ' : '';
  const plus = spaced ? ' + ' : '+';
  if (packs > 0 && loose > 0) return `${packs}${sp}${packUnit}${plus}${fmt(loose)}${sp}${unit}`;
  if (packs > 0) return `${packs}${sp}${packUnit}`;
  return `${fmt(loose)}${sp}${unit}`;
}

export type MedState = 'ok' | 'low' | 'empty' | 'future' | 'prn';

export interface MedStatus {
  total: number;
  daily: number;
  daysUsed: number;
  consumed: number;
  adjustment: number;
  remainingWithToday: number;
  todayDose: number;
  remainingAfterToday: number;
  daysRemaining: number | null;
  runOutDate: string | null;
  usedRatio: number;
  state: MedState;
}

function round2(n: number): number {
  const r = Number(n.toFixed(2));
  return Object.is(r, -0) ? 0 : r;
}

export function getScheduledRemaining(m: Medication, today: Date): number {
  const total = totalUnits(m);
  const daily = dailyDose(m);
  const start = parseYMD(m.startDate);
  const future = diffDays(today, start) > 0;
  const daysUsed = future ? 0 : Math.max(0, diffDays(start, today));
  return total - daysUsed * daily;
}

export function getStatus(m: Medication, today: Date): MedStatus {
  const total = totalUnits(m);
  const daily = dailyDose(m);
  const start = parseYMD(m.startDate);
  const future = diffDays(today, start) > 0;

  const daysUsed = future ? 0 : Math.max(0, diffDays(start, today));
  const adjustment = Number.isFinite(m.stockAdjustment) ? (m.stockAdjustment ?? 0) : 0;
  const rawRemaining = total - daysUsed * daily + adjustment;
  const remainingWithToday = Math.max(0, rawRemaining);
  const consumed = Math.max(0, total - remainingWithToday);

  const todayDose = future ? 0 : Math.min(daily, remainingWithToday);
  const remainingAfterToday = future
    ? remainingWithToday
    : Math.max(0, remainingWithToday - daily);

  const daysRemaining = daily > 0 ? Math.ceil(remainingWithToday / daily - 1e-9) : null;
  const anchor = future ? start : today;
  const runOutDate =
    daysRemaining !== null && daysRemaining > 0 ? toYMD(addDays(anchor, daysRemaining - 1)) : null;

  const usedRatio = total > 0 ? Math.min(1, Math.max(0, (total - remainingWithToday) / total)) : 0;

  let state: MedState;
  if (future) state = 'future';
  else if (daily <= 0) state = remainingWithToday > 0 ? 'prn' : 'empty';
  else if (remainingWithToday <= 1e-9) state = 'empty';
  else if (daysRemaining !== null && daysRemaining <= LOW_STOCK_DAYS) state = 'low';
  else state = 'ok';

  return {
    total,
    daily,
    daysUsed,
    consumed,
    adjustment,
    remainingWithToday,
    todayDose,
    remainingAfterToday,
    daysRemaining,
    runOutDate,
    usedRatio,
    state
  };
}

/** 快速加減（漏吃為正、多吃為負）：以目前有效剩餘為基準推算新 stockAdjustment */
export function computeAdjustmentForDelta(m: Medication, today: Date, delta: number): number {
  const current = getStatus(m, today).remainingWithToday;
  const target = Math.max(0, current + delta);
  const scheduled = getScheduledRemaining(m, today);
  return round2(target - scheduled);
}

/** 盤點校正：依實際清點數量與是否含今日用量，推算新 stockAdjustment */
export function computeAdjustmentForTarget(
  m: Medication,
  today: Date,
  countedUnits: number,
  includeToday: boolean
): number {
  const safeCount = Math.max(0, countedUnits);
  const start = parseYMD(m.startDate);
  const future = diffDays(today, start) > 0;
  const daily = dailyDose(m);
  const targetWithToday = includeToday || future ? safeCount : safeCount + daily;
  const scheduled = getScheduledRemaining(m, today);
  return round2(targetWithToday - scheduled);
}
