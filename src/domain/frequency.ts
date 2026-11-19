export const FREQUENCIES = {
  QD: { timesPerDay: 1, zh: '每天一次', en: 'Once a day' },
  BID: { timesPerDay: 2, zh: '每天兩次', en: 'Twice a day' },
  TID: { timesPerDay: 3, zh: '每天三次', en: 'Three times a day' },
  QID: { timesPerDay: 4, zh: '每天四次', en: 'Four times a day' },
  Q4H: { timesPerDay: 6, zh: '每 4 小時一次', en: 'Every 4 hours' },
  Q6H: { timesPerDay: 4, zh: '每 6 小時一次', en: 'Every 6 hours' },
  Q8H: { timesPerDay: 3, zh: '每 8 小時一次', en: 'Every 8 hours' },
  Q12H: { timesPerDay: 2, zh: '每 12 小時一次', en: 'Every 12 hours' },
  HS: { timesPerDay: 1, zh: '睡前一次', en: 'At bedtime' },
  QOD: { timesPerDay: 0.5, zh: '每兩天一次', en: 'Every other day' },
  QW: { timesPerDay: 1 / 7, zh: '每週一次', en: 'Once a week' },
  PRN: { timesPerDay: 0, zh: '需要時使用', en: 'As needed' },
  CUSTOM: { timesPerDay: 0, zh: '自訂次數', en: 'Custom' }
} as const;

export type FrequencyCode = keyof typeof FREQUENCIES;

export const FREQUENCY_CODES = Object.keys(FREQUENCIES) as FrequencyCode[];

export function timesPerDay(freq: FrequencyCode, custom?: number): number {
  if (freq === 'CUSTOM') return Math.max(0, custom ?? 0);
  return FREQUENCIES[freq].timesPerDay;
}
