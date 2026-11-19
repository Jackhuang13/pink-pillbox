import { useEffect, useState } from 'react';
import { get } from 'idb-keyval';
import { startOfToday } from './domain/calc';

/** 「今天」的本地午夜：跨午夜自動更新＋前景/聚焦校準（計時器皆 cleanup） */
export function useToday(): Date {
  const [today, setToday] = useState<Date>(() => startOfToday());

  useEffect(() => {
    const refresh = () => {
      const next = startOfToday();
      setToday((prev) => (prev.getTime() === next.getTime() ? prev : next));
    };

    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      const next = new Date();
      next.setHours(24, 1, 0, 0); // 明天 00:01（避開 DST 邊界）
      timer = window.setTimeout(() => {
        refresh();
        schedule();
      }, next.getTime() - Date.now());
    };
    schedule();

    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return today;
}

/** IndexedDB 照片 -> Object URL（卸載/換圖必 revoke） */
export function useObjectUrl(imageId?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    let created: string | undefined;
    if (!imageId) {
      setUrl(undefined);
      return;
    }
    get<Blob>(imageId)
      .then((blob) => {
        if (alive && blob) {
          created = URL.createObjectURL(blob);
          setUrl(created);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [imageId]);

  return url;
}

/** 偵測網路連線狀態 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
