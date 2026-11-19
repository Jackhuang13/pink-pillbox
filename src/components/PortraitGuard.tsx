import { useEffect, useState } from 'react';
import { useApp } from '../store';

function isEditableFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    (el as HTMLElement).isContentEditable
  );
}

/**
 * 判斷是否真正處於「手機橫向」，避免直向手機開啟虛擬鍵盤壓縮高度時誤觸橫向提示
 */
function isTrueMobileLandscape(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window.innerWidth;
  const h = window.innerHeight;

  // 1. 優先以 Screen Orientation API 判定（直向開軟鍵盤時仍為 portrait-*）
  const orientType = window.screen?.orientation?.type;
  if (orientType) {
    if (orientType.startsWith('portrait')) return false;
    return w > h && h <= 520 && w >= 540;
  }

  // 2. 舊版 iOS Safari fallback：實體旋轉角度
  const legacyOrient = (window as Window & { orientation?: number }).orientation;
  if (typeof legacyOrient === 'number') {
    return Math.abs(legacyOrient) === 90 && h <= 520;
  }

  // 3. 最終 fallback：編輯表單中或窄螢幕（軟鍵盤收合過渡）不顯示遮罩
  if (isEditableFocused()) return false;
  return w > h && h <= 520 && w >= 540;
}

export function PortraitGuard() {
  const { t } = useApp();
  const [visible, setVisible] = useState<boolean>(() => isTrueMobileLandscape());

  useEffect(() => {
    const update = () => setVisible(isTrueMobileLandscape());
    update();

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    window.screen?.orientation?.addEventListener?.('change', update);
    window.visualViewport?.addEventListener('resize', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      window.screen?.orientation?.removeEventListener?.('change', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="portrait-guard" role="dialog" aria-modal="true" aria-label={t('rotateTitle')}>
      <div className="portrait-guard__box">
        <div className="portrait-guard__phone">📱</div>
        <h2>{t('rotateTitle')}</h2>
        <p>{t('rotateHint')}</p>
      </div>
    </div>
  );
}
