import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import type { ReactNode } from 'react';
import { del, set as idbSet } from 'idb-keyval';
import type { Lang, Medication, Settings } from './core/types';
import type { I18nKey } from './i18n';
import { translate } from './i18n';

const STORAGE_KEY = 'pillpal:v1';
const DEFAULT_SETTINGS: Settings = { lang: 'zh', font: 'Huninn' };
const imgKey = (id: string) => `img_${id}`;

interface AppState {
  meds: Medication[];
  settings: Settings;
}

type Action =
  | { type: 'save'; med: Medication }
  | { type: 'adjust'; id: string; stockAdjustment: number }
  | { type: 'remove'; id: string }
  | { type: 'settings'; patch: Partial<Settings> };

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      return {
        meds: Array.isArray(parsed.meds) ? parsed.meds : [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) }
      };
    }
  } catch (e) {
    console.warn('load failed', e);
  }
  return { meds: [], settings: { ...DEFAULT_SETTINGS } };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'save': {
      const exists = state.meds.some((m) => m.id === action.med.id);
      return {
        ...state,
        meds: exists
          ? state.meds.map((m) => (m.id === action.med.id ? action.med : m))
          : [...state.meds, action.med]
      };
    }
    case 'adjust':
      return {
        ...state,
        meds: state.meds.map((m) =>
          m.id === action.id
            ? { ...m, stockAdjustment: action.stockAdjustment === 0 ? undefined : action.stockAdjustment }
            : m
        )
      };
    case 'remove':
      return { ...state, meds: state.meds.filter((m) => m.id !== action.id) };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    default:
      return state;
  }
}

interface AppContextValue {
  meds: Medication[];
  settings: Settings;
  lang: Lang;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
  /** image: undefined = 保留舊圖 / null = 刪除圖 / Blob = 取代為新圖 */
  saveMed: (med: Medication, image?: Blob | null) => Promise<void>;
  setMedAdjustment: (id: string, stockAdjustment: number) => void;
  removeMed: (id: string) => Promise<void>;
  setSettings: (patch: Partial<Settings>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const { meds, settings } = state;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('persist failed', e);
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.lang = settings.lang === 'zh' ? 'zh-Hant' : 'en';
    document.documentElement.style.setProperty(
      '--font-app',
      `'${settings.font}', 'Iansui', 'Huninn', ui-rounded, 'PingFang TC', 'Microsoft JhengHei', system-ui, sans-serif`
    );
  }, [settings.lang, settings.font]);

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) => translate(settings.lang, key, vars),
    [settings.lang]
  );

  const saveMed = useCallback(async (med: Medication, image?: Blob | null) => {
    let next = med;
    if (image instanceof Blob) {
      await idbSet(imgKey(med.id), image);
      next = { ...med, imageId: imgKey(med.id) };
    } else if (image === null) {
      if (med.imageId) await del(med.imageId);
      next = { ...med, imageId: undefined };
    }
    dispatch({ type: 'save', med: next });
  }, []);

  const removeMed = useCallback(
    async (id: string) => {
      const target = meds.find((m) => m.id === id);
      if (target?.imageId) {
        try {
          await del(target.imageId);
        } catch {
          /* 照片刪除失敗不阻擋藥品刪除 */
        }
      }
      dispatch({ type: 'remove', id });
    },
    [meds]
  );

  const setMedAdjustment = useCallback(
    (id: string, stockAdjustment: number) => dispatch({ type: 'adjust', id, stockAdjustment }),
    []
  );

  const setSettings = useCallback(
    (patch: Partial<Settings>) => dispatch({ type: 'settings', patch }),
    []
  );

  const value: AppContextValue = {
    meds,
    settings,
    lang: settings.lang,
    t,
    saveMed,
    setMedAdjustment,
    removeMed,
    setSettings
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}
