import Phaser from 'phaser';
import type { View } from './types';
import type { I18nKey } from '../i18n';
import type { SyncPayload } from '../game/types';

export interface ToastPayload {
  key: I18nKey;
  vars?: Record<string, string | number>;
  tone?: 'default' | 'warn';
}

/** 雙向通訊橋：React(HUD) ↔ Phaser(Scene) 的唯一通道 */
export type AppEventMap = {
  'meds:sync': (payload: SyncPayload) => void;
  'med:selected': (id: string) => void;
  'scene:ready': () => void;
  'ui:toast': (payload: ToastPayload) => void;
  'ui:navigate': (view: View) => void;
  'pwa:installable': (available: boolean) => void;
};

// 規範②：Phaser.Events.EventEmitter 單例模式
const bus = new Phaser.Events.EventEmitter();

/** 型別安全封裝：emit/on/off 與 Phaser 同簽名，事件與 payload 編譯期檢查 */
export const EventBus = {
  emit<K extends keyof AppEventMap>(event: K, ...args: Parameters<AppEventMap[K]>): void {
    bus.emit(event, ...args);
  },
  on<K extends keyof AppEventMap>(event: K, fn: AppEventMap[K], context?: unknown): void {
    bus.on(event, fn, context);
  },
  off<K extends keyof AppEventMap>(event: K, fn?: AppEventMap[K], context?: unknown): void {
    bus.off(event, fn, context);
  }
};
