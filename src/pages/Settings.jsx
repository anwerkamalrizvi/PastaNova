import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getSettings, saveSettings, getDefaultSettings, clearAllUserData, saveGoogleClientId, getGoogleClientId } from '../utils/storage.js';
import { PASTA_NOVA_AGENT_PERSONA } from '../data/knowledgeBase.js';

export default function Settings() {
  const { user, signOut, updateClientId } = useAuth();
  const [settings, setSettings] = useState(getDefaultSettings());
  const [showApiKey, setShowApiKey] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [saved, setSaved] = useState(false);
  const [clearStep, setClearStep] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!user) return;
    setSettings(getSettings(user.id));
    setGoogleClientId(getGoogleClientId());
  }, [user]);

  const handleSave = () => {
    if (!user) return;
    saveSettings(user.id, settings);
    saveGoogleClientId(googleClientId);
    updateClientId(googleClientId);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearAll = () => {
    if (clearStep === 0) { setClearStep(1); return; }
    if (clearStep === 1) { setClearStep(2); return; }
    clearAllUserData(user.id);
    signOut();
  };

  const update = (path, value) => {
    const parts = path.split('.');
    if (parts.length === 1) {
      setSettings(prev => ({ ...prev, [path]: value }));
    } else if (parts.length === 2) {
      setSettings(prev => ({ ...prev, [parts[0]]: { ...prev[parts[0]], [parts[1]]: value } }));
    } else if (parts.length === 3) {
      setSettings(prev => ({
        ...prev,
        [parts[0]]: {
          ...prev[parts[0]],
          [parts[1]]: { ...prev[parts[0]]?.[parts[1]], [parts[2]]: value }
        }
      }));
    }
  };

  const INVENTORY_ITEMS = [
    { key: 'flour', label: '🌾 Semolina / Flour', unit: 'kg' },
    { key: 'gas', label: '🔥 Natural Gas', unit: 'm³' },
    { key: 'oil', label: '🛢️ Generator Oil', unit: 'L' },
    { key: 'packaging', label: '📦 Packaging Film', unit: 'rolls' },
    { key: 'additives', label: '🎨 Color/Flavor Additives', unit: 'kg' },
  ];

  return (
    <div className="p-6 space-y-6 page-enter max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Settings</h2>
          <p className="text-slate-400 text-sm mt-1">Configure your Pasta Nova Agent platform</p>
        </div>
        <button
          onClick={handleSave}
          className={`btn-primary flex items-center gap-2 transition-all ${saved ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
        >
          <Save size={16} />
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* AI Configuration */}
      <div className="card">
        <h3 className="text-slate-100 font-bold mb-4 flex items-center gap-2">
          <span className="text-lg">🤖</span> AI Configuration
        </h3>
          <div>
            <label className="label">AI Model</label>
            <div className="input-field opacity-50 cursor-not-allowed text-slate-400">gemini-2.5-flash-preview-05-20</div>
            <p className="text-slate-500 text-xs mt-1">Model is fixed to Gemini 2.5 Flash for optimal performance.</p>
          </div>
        </div>
      </div>

      {/* Company Configuration */}
      <div className="card">
        <h3 className="text-slate-100 font-bold mb-4 flex items-center gap-2">
          <span className="text-lg">🏭</span> Company Configuration
        </h3>
          <div>
            <label className="label">Extruder Capacity Class</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'small', label: 'Small', sub: '75mm · 200–400 kg/hr' },
                { id: 'medium', label: 'Medium', sub: '120mm · 500–900 kg/hr' },
                { id: 'large', label: 'Large', sub: '160mm+ · 1000–2000 kg/hr' },
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => update('extruderCapacity', c.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    settings.extruderCapacity === c.id
                      ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                      : 'border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="font-semibold text-sm">{c.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{c.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Shift Times */}
      <div className="card">
        <h3 className="text-slate-100 font-bold mb-4 flex items-center gap-2">
          <span className="text-lg">⏰</span> Shift Schedule
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: 'morning', label: '☀️ Morning Shift', icon: '☀️' },
            { key: 'evening', label: '🌆 Evening Shift', icon: '🌆' },
            { key: 'night', label: '🌙 Night Shift', icon: '🌙' },
          ].map(s => (
            <div key={s.key}>
              <label className="label">{s.label} Start</label>
              <input
                type="time"
                value={settings.shiftTimes?.[s.key] || '06:00'}
                onChange={e => update(`shiftTimes.${s.key}`, e.target.value)}
                className="input-field"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Inventory Thresholds */}
      <div className="card">
        <h3 className="text-slate-100 font-bold mb-4 flex items-center gap-2">
          <span className="text-lg">📦</span> Inventory Alert Thresholds
        </h3>
        <div className="space-y-4">
          {INVENTORY_ITEMS.map(item => (
            <div key={item.key} className="flex items-center gap-4">
              <div className="w-48 flex-shrink-0">
                <span className="text-slate-300 text-sm font-medium">{item.label}</span>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-brand-400">⚠ Warning ({item.unit})</label>
                  <input
                    type="number"
                    value={settings.thresholds?.[item.key]?.warning || ''}
                    onChange={e => update(`thresholds.${item.key}.warning`, parseFloat(e.target.value))}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="label text-red-400">🔴 Critical ({item.unit})</label>
                  <input
                    type="number"
                    value={settings.thresholds?.[item.key]?.critical || ''}
                    onChange={e => update(`thresholds.${item.key}.critical`, parseFloat(e.target.value))}
                    className="input-field text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Prompt Preview */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-100 font-bold flex items-center gap-2">
            <span className="text-lg">📜</span> AI System Prompt (Read-Only)
          </h3>
          <button onClick={() => setShowPrompt(v => !v)} className="btn-secondary text-sm py-1.5 px-3">
            {showPrompt ? 'Hide' : 'Show'} Prompt
          </button>
        </div>
        <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-xl border border-slate-700 mb-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 agent-pulse" />
          <span className="text-emerald-400 text-sm font-semibold">PASTA NOVA AGENT v1.0</span>
          <span className="text-slate-500 text-sm">· Knowledge Base v1.0</span>
        </div>
        {showPrompt && (
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 max-h-64 overflow-y-auto">
            <pre className="text-slate-400 text-xs font-mono whitespace-pre-wrap">{PASTA_NOVA_AGENT_PERSONA}</pre>
          </div>
        )}
      </div>

      {/* User Account */}
      <div className="card">
        <h3 className="text-slate-100 font-bold mb-4 flex items-center gap-2">
          <span className="text-lg">👤</span> Account
        </h3>
        {user && (
          <div className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-xl border border-slate-700 mb-4">
            {user.picture && <img src={user.picture} alt="" className="w-12 h-12 rounded-full border-2 border-brand-500/40" />}
            <div>
              <div className="text-slate-100 font-semibold">{user.name}</div>
              <div className="text-slate-400 text-sm">{user.email}</div>
              <div className="text-slate-500 text-xs mt-0.5">User ID: {user.id?.slice(0, 12)}...</div>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="card border-red-500/20">
        <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
          <AlertTriangle size={18} /> Danger Zone
        </h3>
        <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/20">
          <p className="text-slate-300 text-sm font-semibold mb-1">Clear All Data</p>
          <p className="text-slate-500 text-sm mb-4">This permanently deletes ALL your data: machine readings, inventory, chat history, production logs, and settings. This cannot be undone.</p>
          <button
            onClick={handleClearAll}
            className={`btn-danger flex items-center gap-2 text-sm ${clearStep === 2 ? 'animate-pulse' : ''}`}
          >
            <Trash2 size={14} />
            {clearStep === 0 ? 'Clear All My Data' : clearStep === 1 ? 'Are you sure? Click again to confirm' : '⚠️ FINAL WARNING — Click to permanently delete everything'}
          </button>
          {clearStep > 0 && (
            <button onClick={() => setClearStep(0)} className="ml-3 text-slate-500 text-sm hover:text-slate-300 transition-colors">Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}
