import { registerSW } from 'virtual:pwa-register';
import { EventBus } from './core/EventBus';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function setupPWA(): void {
  registerSW({
    immediate: true,
    onOfflineReady() {
      EventBus.emit('ui:toast', { key: 'offlineReady' });
    },
    onRegisterError(error) {
      console.error('SW registration failed', error);
    }
  });

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    EventBus.emit('pwa:installable', true);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    EventBus.emit('pwa:installable', false);
  });

  // 安裝後嘗試鎖定直向；iOS 不支援則由 CSS 遮罩補位
  if (isStandalone()) {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    orientation.lock?.('portrait').catch(() => undefined);
  }
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

export function isInstallable(): boolean {
  return deferredPrompt !== null;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  EventBus.emit('pwa:installable', false);
  return choice.outcome === 'accepted';
}
