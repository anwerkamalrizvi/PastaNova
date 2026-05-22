import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import GoogleLoginScreen from './components/GoogleLoginScreen.jsx';
import GoogleSetupScreen from './components/GoogleSetupScreen.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import AlertBanner from './components/AlertBanner.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MachineMonitor from './pages/MachineMonitor.jsx';
import Inventory from './pages/Inventory.jsx';
import ChatAssistant from './pages/ChatAssistant.jsx';
import Production from './pages/Production.jsx';
import SalesMarketing from './pages/SalesMarketing.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import {
  getMachineLastReading, getAppState, getSettings
} from './utils/storage.js';
import {
  calculateExtruderHealth, calculateFlourFeederHealth, calculatePanelHealth,
  calculateSensorHealth, calculatePreDryerHealth, calculateDryerHealth
} from './utils/alerts.js';

const PAGES = {
  dashboard: Dashboard,
  machine: MachineMonitor,
  inventory: Inventory,
  chat: ChatAssistant,
  production: Production,
  sales: SalesMarketing,
  reports: Reports,
  settings: Settings,
};

function AppInner() {
  const { isAuthenticated, isLoading, googleClientId, user } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [appState, setAppState] = useState({ activeLine: 'Idle', activeShape: null });

  // Check machine alerts periodically
  useEffect(() => {
    if (!user) return;
    const checkAlerts = () => {
      const state = getAppState(user.id);
      setAppState(state);
      const s = getSettings(user.id);
      const machines = [
        { id: 'extruder', label: 'Extruder', calc: calculateExtruderHealth },
        { id: 'flourFeeder', label: 'Flour Feeder', calc: calculateFlourFeederHealth },
        { id: 'electronicsPanel', label: 'Electronics Panel', calc: calculatePanelHealth },
        { id: 'sensors', label: 'Sensors', calc: calculateSensorHealth },
        { id: 'preDryer', label: 'Pre-Dryer', calc: calculatePreDryerHealth },
        { id: 'dryer', label: 'Dryer', calc: calculateDryerHealth },
      ];
      const newAlerts = [];
      machines.forEach(m => {
        const last = getMachineLastReading(user.id, m.id);
        if (!last) return;
        const health = m.calc(last.data);
        if (health.status !== 'normal' && !dismissedAlerts.includes(m.id)) {
          newAlerts.push({ machine: m.label, id: m.id, status: health.status, issues: health.issues });
        }
      });
      setAlerts(newAlerts);
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, [user, dismissedAlerts]);

  const handleDismiss = (machineId) => {
    setDismissedAlerts(prev => [...prev, machineId]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/30">
            <span className="text-2xl">🌾</span>
          </div>
          <div className="flex gap-1 justify-center">
            <div className="w-2 h-2 rounded-full bg-brand-400 typing-dot" />
            <div className="w-2 h-2 rounded-full bg-brand-400 typing-dot" />
            <div className="w-2 h-2 rounded-full bg-brand-400 typing-dot" />
          </div>
        </div>
      </div>
    );
  }

  // Show Google Client ID setup if not configured
  if (!googleClientId) {
    return <GoogleSetupScreen />;
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <GoogleLoginScreen />;
  }

  const PageComponent = PAGES[activePage] || Dashboard;
  const settings = user ? getSettings(user.id) : null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {/* Sidebar */}
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <TopBar
          activePage={activePage}
          onNavigate={setActivePage}
          activeLine={appState.activeLine}
          activeShape={appState.activeShape}
          shiftTimes={settings?.shiftTimes}
        />

        {/* Alert banner */}
        {alerts.length > 0 && (
          <AlertBanner alerts={alerts} onDismiss={handleDismiss} />
        )}

        {/* Page content */}
        <div className={`flex-1 ${activePage === 'chat' ? '' : 'overflow-y-auto'}`}>
          <PageComponent
            onNavigate={setActivePage}
            key={activePage} // Force remount on page change for fresh animation
          />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
