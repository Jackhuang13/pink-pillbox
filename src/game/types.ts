import type { MedState } from '../domain/calc';
import type { MedIconId } from '../domain/icons';

/** 上架精靈的最小視覺資料（domain 算好後同步給 Scene；業務資料留在 React store） */
export interface SceneMed {
  id: string;
  name: string;
  icon: MedIconId;
  state: MedState;
  daysRemaining: number | null;
}

export interface SyncPayload {
  meds: SceneMed[];
}
