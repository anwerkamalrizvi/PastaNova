import React, { useState, useEffect } from 'react';
import { Activity, Package, AlertTriangle, TrendingUp, Zap, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  getMachineLastReading, getInventory, getAppState, getProductionLogs, getSettings
} from '../utils/storage.js';
import {
  calculateExtruderHealth, calculateFlourFeederHealth, calculatePanelHealth,
  calculateSensorHealth, calculatePreDryerHealth, calculateDryerHealth,
  getStatusBorderClass, getStatusBadgeClass, getStatusLabel, getStatusColor, getInventoryStatus
} from '../utils/alerts.js';

const MACHINES = [
  { id: 'extruder', label: 'Extruder', icon: '⚙️', calcHealth: calculateExtruderHealth },
  { id: 'flourFeeder', label: 'Flour Feeder', icon: '🌾', calcHealth: calculateFlourFeederHealth },
  { id: 'electronicsPanel', label: 'Electronics Panel', icon: '🖥️', calcHealth: calculatePanelHealth },
  { id: 'sensors', label: 'Sensors', icon: '📡', calcHealth: calculateSensorHealth },
  { id: 'preDryer', label: 'Pre-Dryer', icon: '💨', calcHealth: calculatePreDryerHealth },
  { id: 'dryer', label: 'Dryer', icon: '🔥', calcHealth: calculateDryerHealth },
];

function MachineCard({ machine, onNavigate }) {
  const health = machine.health;
  const score = health?.score ?? null;
  const status = health?.status || 'unknown';
  const issues = health?.issues || [];

  const barWidth = score !== null ? `${score}%` : '0%';
  const barColor = status === 'normal' ? '#10b981' : status === 'warning' ? '#f59e0b' : status === 'critical' ? '#ef4444' : '#64748b';

  const timeAgo = (ts) => {
    if (!ts) return 'No data';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className={`card ${getStatusBorderClass(status)} hover:shadow-xl transition-all duration-200`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{machine.icon}</span>
          <div>
            <h3 className="text-slate-100 font-semibold text-sm">{machine.label}</h3>
            <span className="text-slate-500 text-xs">{timeAgo(machine.lastTs)}</span>
          </div>
        </div>
        <span className={`${getStatusBadgeClass(status)} text-xs`}>
          {status === 'normal' ? '🟢 OK' : status === 'warning' ? '🟡 WARN' : status === 'critical' ? '🔴 CRIT' : '⚪ N/A'}
        </span>
      </div>

      {/* Health bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-slate-400 text-xs">Health Score</span>
          <span className={`font-bold text-sm ${getStatusColor(status)}`}>
            {score !== null ? `${score}%` : 'N/A'}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: barWidth, backgroundColor: barColor }}
          />
        </div>
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-red-400 truncate">⚠ {issues[0]}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-slate-700">
        <button
          onClick={() => onNavigate('machine')}
          className="flex-1 text-xs text-slate-400 hover:text-brand-400 flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
        >
          View Details <ChevronRight size={12} />
        </button>
        <button
          onClick={() => onNavigate('machine')}
          className="flex-1 text-xs text-brand-400 font-semibold flex items-center justify-center gap-1 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 transition-colors border border-brand-500/20"
        >
          Analyze →
        </button>
      </div>
    </div>
  );
}

export default function Dashboard({ onNavigate }) {
  const { user } = useAuth();
  const [data, setData] = useState({ machines: [], inventory: null, appState: null, prodLogs: [] });
  const [settings, setSettings] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  const load = () => {
    if (!user) return;
    const inv = getInventory(user.id);
    const appState = getAppState(user.id);
    const prodLogs = getProductionLogs(user.id).slice(0, 7);
    const s = getSettings(user.id);
    setSettings(s);

    const machines = MACHINES.map(m => {
      const last = getMachineLastReading(user.id, m.id);
      const health = m.calcHealth(last?.data);
      return { ...m, health, lastTs: last?.timestamp };
    });

    setData({ machines, inventory: inv, appState, prodLogs });
  };

  useEffect(() => { load(); }, [user]);

  const alerts = data.machines.filter(m =>
    (m.health?.status === 'critical' || m.health?.status === 'warning') && !dismissedAlerts.includes(m.id)
  );

  const totalOutput = data.prodLogs.reduce((s, l) => s + (l.actualKg || 0), 0);
  const totalTarget = data.prodLogs.reduce((s, l) => s + (l.targetKg || 0), 0);
  const efficiency = totalTarget > 0 ? Math.round((totalOutput / totalTarget) * 100) : 0;

  const INVENTORY_ICONS = { flour: '🌾', gas: '🔥', oil: '🛢️', packaging: '📦', additives: '🎨' };

  return (
    <div className="p-6 space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.givenName || 'Operator'} 👋
          </h2>
          <p className="text-slate-400 text-sm mt-1">Here's your factory overview for today</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Alert strip */}
      {alerts.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-400 font-semibold text-sm">
              {alerts.filter(a => a.health?.status === 'critical').length} CRITICAL, {alerts.filter(a => a.health?.status === 'warning').length} WARNING — Machine attention required
            </p>
            <p className="text-red-300/70 text-xs mt-0.5">
              {alerts.map(a => a.label).join(', ')}
            </p>
          </div>
          <button
            onClick={() => onNavigate('machine')}
            className="btn-danger text-xs py-1.5 px-3 flex-shrink-0"
          >
            View Details
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Active Line',
            value: data.appState?.activeLine || 'Idle',
            sub: data.appState?.activeShape || 'No shape set',
            icon: <Activity size={20} className="text-brand-400" />,
            color: 'brand',
          },
          {
            label: 'Machine Health',
            value: `${data.machines.filter(m => m.health?.status === 'normal').length}/${data.machines.length}`,
            sub: 'Machines nominal',
            icon: <Zap size={20} className="text-emerald-400" />,
            color: 'emerald',
          },
          {
            label: '7-Day Output',
            value: `${(totalOutput / 1000).toFixed(1)}t`,
            sub: `${efficiency}% of target`,
            icon: <TrendingUp size={20} className="text-blue-400" />,
            color: 'blue',
          },
          {
            label: 'Stock Alerts',
            value: settings ? Object.entries(getInventory(user?.id) || {}).filter(([k, v]) =>
              getInventoryStatus(k, v.current, settings.thresholds) !== 'normal'
            ).length : 0,
            sub: 'Items need attention',
            icon: <Package size={20} className="text-orange-400" />,
            color: 'orange',
          },
        ].map((kpi, i) => (
          <div key={i} className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">{kpi.icon}</div>
            </div>
            <div className="text-2xl font-bold text-slate-100">{kpi.value}</div>
            <div className="text-slate-400 text-xs mt-1">{kpi.sub}</div>
            <div className="text-slate-500 text-xs mt-0.5 font-medium">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Machine Health Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-100 font-semibold text-lg">Machine Health</h3>
          <button onClick={() => onNavigate('machine')} className="text-brand-400 text-sm hover:text-brand-300 flex items-center gap-1">
            All Machines <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.machines.map(m => (
            <MachineCard key={m.id} machine={m} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      {/* Bottom row: Inventory + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Summary */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-100 font-semibold">Inventory Status</h3>
            <button onClick={() => onNavigate('inventory')} className="text-brand-400 text-sm hover:text-brand-300 flex items-center gap-1">
              Manage <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {data.inventory && Object.entries(data.inventory).map(([key, item]) => {
              const status = settings ? getInventoryStatus(key, item.current, settings.thresholds) : 'normal';
              const th = settings?.thresholds?.[key];
              const maxVal = th ? th.warning * 3 : item.current * 2;
              const pct = Math.min((item.current / maxVal) * 100, 100);
              const barColor = status === 'normal' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#ef4444';
              return (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 text-sm flex items-center gap-2">
                      <span>{INVENTORY_ICONS[key]}</span> {item.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-100 text-sm font-semibold">
                        {item.current.toLocaleString()} {item.unit}
                      </span>
                      {status !== 'normal' && (
                        <span className={`${getStatusBadgeClass(status)} text-xs`}>
                          {status === 'critical' ? '⚠ LOW' : '↓ WARN'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-slate-100 font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Ask AI Agent', icon: '💬', page: 'chat', color: 'bg-brand-500/10 border-brand-500/20 hover:bg-brand-500/20 text-brand-300' },
              { label: 'Machine Analysis', icon: '🔧', page: 'machine', color: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 text-blue-300' },
              { label: 'Log Production', icon: '📋', page: 'production', color: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-300' },
              { label: 'View Reports', icon: '📊', page: 'reports', color: 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 text-purple-300' },
              { label: 'Update Inventory', icon: '📦', page: 'inventory', color: 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20 text-orange-300' },
              { label: 'Export Planning', icon: '🌍', page: 'sales', color: 'bg-teal-500/10 border-teal-500/20 hover:bg-teal-500/20 text-teal-300' },
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => onNavigate(action.page)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-150 ${action.color}`}
              >
                <span className="text-2xl">{action.icon}</span>
                <span className="text-xs font-semibold text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ask Agent CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600/20 via-brand-500/15 to-brand-600/20 border border-brand-500/30 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-500/5 to-transparent" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 agent-pulse" />
              <span className="text-emerald-400 text-xs font-semibold">PASTA NOVA AGENT ONLINE</span>
            </div>
            <h3 className="text-slate-100 font-bold text-xl mb-1">What can I help you with today?</h3>
            <p className="text-slate-400 text-sm">Machine diagnosis, production planning, inventory predictions, export strategy — ask anything.</p>
          </div>
          <button
            onClick={() => onNavigate('chat')}
            className="btn-primary flex items-center gap-2 whitespace-nowrap flex-shrink-0 px-6 py-3 text-base shadow-lg shadow-brand-500/20"
          >
            💬 Ask Agent
          </button>
        </div>
      </div>
    </div>
  );
}
