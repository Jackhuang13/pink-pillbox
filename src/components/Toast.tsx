import { useEffect, useState } from 'react';
import { EventBus } from '../core/EventBus';
import type { ToastPayload } from '../core/EventBus';
import { useApp } from '../store';

export function Toast() {
  const { t } = useApp();
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    const onToast = (p: ToastPayload) => setToast({ ...p });
    EventBus.on('ui:toast', onToast);
    return () => {
      EventBus.off('ui:toast', onToast);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const duration = toast.tone === 'warn' ? 5000 : 2600;
    const id = window.setTimeout(() => setToast(null), duration);
    return () => window.clearTimeout(id);
  }, [toast]);

  if (!toast) return null;
  const isWarn = toast.tone === 'warn';

  return (
    <div
      className={`toast${isWarn ? ' toast--warn' : ''}`}
      role={isWarn ? 'alert' : 'status'}
      onClick={() => setToast(null)}
    >
      {isWarn ? '💛 ' : '🌸 '}
      {t(toast.key, toast.vars)}
    </div>
  );
}
