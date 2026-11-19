import { useEffect, useState } from 'react';
import { PortraitGuard } from './components/PortraitGuard';
import { Toast } from './components/Toast';
import { EventBus } from './core/EventBus';
import type { View } from './core/types';
import { useOnlineStatus } from './hooks';
import { AddMedPage } from './pages/AddMedPage';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { AppProvider, useApp } from './store';

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const [view, setView] = useState<View>({ name: 'home' });
  const isOnline = useOnlineStatus();
  const { t } = useApp();

  useEffect(() => {
    const onNavigate = (v: View) => {
      setView(v);
      window.scrollTo({ top: 0 });
    };
    EventBus.on('ui:navigate', onNavigate);
    return () => {
      EventBus.off('ui:navigate', onNavigate);
    };
  }, []);

  return (
    <div className="app">
      {view.name === 'home' && <HomePage />}
      {view.name === 'settings' && <SettingsPage />}
      {view.name === 'add' && <AddMedPage key={view.editId ?? 'new'} editId={view.editId} />}
      {!isOnline && (
        <div className="offline-pill" role="status">
          📡 {t('offlineMode')}
        </div>
      )}
      <Toast />
      <PortraitGuard />
    </div>
  );
}
