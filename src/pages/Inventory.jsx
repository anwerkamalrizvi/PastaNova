import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, TrendingDown, RefreshCw, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  getInventory, updateInventory, getInventoryLog, addInventoryLog,
  getSettings, calculateBurnRate, getChatHistory, getUserProfile
} from '../utils/storage.js';
import { getInventoryStatus, getStatusBadgeClass, getStatusColor } from '../utils/alerts.js';
import { predictInventory } from '../services/geminiService.js';
import LoadingIndicator from '../components/LoadingIndicator.jsx';

const ICONS = { flour: '🌾', gas: '🔥', oil: '🛢️', packaging: '📦', additives: '🎨' };

function formatAIResponse(text) {
  return text.split('\n').map((line, i) => {
    if (line.match(/^\d+\./)) return <div key={i} className="mt-2 font-semibold text-brand-300 text-sm">{line}</div>;
    if (line.startsWith('►') || line.startsWith('▶')) return <div key={i} className="mt-3 font-semibold text-brand-300">{line}</div>;
    if (line.trim() === '') return <div key={i} className="h-1" />;
    return <div key={i} className="text-slate-300 text-sm leading-relaxed">{line}</div>;
  });
}

export default function Inventory() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState(null);
  const [settings, setSettings] = useState(null);
  const [log, setLog] = useState([]);
  const [modal, setModal] = useState(null); // { item, type: 'add'|'consume' }
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [supplier, setSupplier] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [productionPlan, setProductionPlan] = useState('');
  const [leadTime, setLeadTime] = useState('3');
  const abortRef = useRef(null);

  const load = () => {
    if (!user) return;
    setInventory(getInventory(user.id));
    setSettings(getSettings(user.id));
    setLog(getInventoryLog(user.id).slice(0, 50));
  };

  useEffect(() => { load(); }, [user]);

  const handleTransaction = () => {
    if (!modal || !amount || !user) return;
    const inv = { ...inventory };
    const item = { ...inv[modal.item] };
    const qty = parseFloat(amount);

    if (modal.type === 'add') {
      item.current += qty;
    } else {
      item.current = Math.max(0, item.current - qty);
    }
    inv[modal.item] = item;
    updateInventory(user.id, inv);
    addInventoryLog(user.id, { item: modal.item, type: modal.type, amount: qty, reason, supplier });
    setInventory(inv);
    setLog(getInventoryLog(user.id).slice(0, 50));
    setModal(null);
    setAmount('');
    setReason('');
    setSupplier('');
  };

  const handlePredict = async () => {
    if (!user) return;
    setAiLoading(true);
    setAiResponse(null);
    setAiError(null);
    abortRef.current = new AbortController();
    const profile = getUserProfile(user.id);
    const chatHistory = getChatHistory(user.id);
    const result = await predictInventory({
      apiKey: settings?.geminiApiKey,
      inventory: Object.entries(inventory || {}).map(([k, v]) => ({
        item: v.label, current: v.current, unit: v.unit, burnRate: calculateBurnRate(user.id, k).toFixed(1) + `/${v.unit}/day`,
      })),
      productionPlan: productionPlan || '2 shifts/day, pasta line active',
      leadTimeDays: leadTime,
      conversationHistory: chatHistory,
      userProfile: profile,
      signal: abortRef.current.signal,
    });
    if (result.text) setAiResponse(result.text);
    else setAiError(result.error);
    setAiLoading(false);
  };

  const exportCSV = () => {
    const rows = [['Timestamp', 'Item', 'Type', 'Amount', 'Reason', 'Supplier']];
    log.forEach(e => rows.push([e.timestamp, e.item, e.type, e.amount, e.reason || '', e.supplier || '']));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `pasta-nova-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (!inventory) return <div className="p-6 text-slate-400">Loading...</div>;

  return (
    <div className="p-6 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Inventory Management</h2>
          <p className="text-slate-400 text-sm mt-1">Track stock levels, burn rates, and AI reorder predictions</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm"><RefreshCw size={14} /> Refresh</button>
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm"><Download size={14} /> Export CSV</button>
        </div>
      </div>

      {/* Stock cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.entries(inventory).map(([key, item]) => {
          const status = settings ? getInventoryStatus(key, item.current, settings.thresholds) : 'normal';
          const burnRate = calculateBurnRate(user?.id, key);
          const daysLeft = burnRate > 0 ? (item.current / burnRate).toFixed(1) : '∞';
          const thresholds = settings?.thresholds?.[key];
          const maxBar = thresholds ? thresholds.warning * 4 : item.current * 2 || 100;
          const pct = Math.min((item.current / maxBar) * 100, 100);
          const barColor = status === 'normal' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#ef4444';

          return (
            <div key={key} className={`card ${status === 'critical' ? 'border-red-500/50' : status === 'warning' ? 'border-brand-500/40' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ICONS[key]}</span>
                  <div>
                    <h3 className="text-slate-100 font-semibold text-sm">{item.label}</h3>
                    <p className="text-slate-500 text-xs">
                      Burn rate: {burnRate > 0 ? `${burnRate.toFixed(1)} ${item.unit}/day` : 'No data yet'}
                    </p>
                  </div>
                </div>
                <span className={getStatusBadgeClass(status)}>
                  {status === 'normal' ? '✓ OK' : status === 'warning' ? '⚠ LOW' : '🔴 CRITICAL'}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-end mb-1">
                  <span className={`text-3xl font-bold ${getStatusColor(status)}`}>
                    {item.current.toLocaleString()}
                  </span>
                  <span className="text-slate-400 text-sm">{item.unit}</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-500 text-xs">Days remaining</span>
                  <span className={`text-xs font-semibold ${
                    parseFloat(daysLeft) < 7 ? 'text-red-400' : parseFloat(daysLeft) < 14 ? 'text-brand-400' : 'text-emerald-400'
                  }`}>{daysLeft} days</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setModal({ item: key, type: 'add' }); setAmount(''); setReason(''); setSupplier(''); }}
                  className="flex-1 btn-secondary flex items-center justify-center gap-1 text-xs py-2"
                >
                  <Plus size={12} /> Add Stock
                </button>
                <button
                  onClick={() => { setModal({ item: key, type: 'consume' }); setAmount(''); setReason(''); setSupplier(''); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center gap-1 text-xs py-2 rounded-lg transition-colors font-semibold"
                >
                  <Minus size={12} /> Consume
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Prediction */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="text-slate-100 font-semibold">Predict Reorder Date</h3>
              <p className="text-slate-400 text-sm">AI-powered inventory forecasting</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Production Plan (next 7 days)</label>
              <textarea
                value={productionPlan}
                onChange={e => setProductionPlan(e.target.value)}
                placeholder="e.g. 2 shifts/day, running Elbow pasta + Vermicelli standard, expected 3 tons/day"
                rows={3}
                className="input-field resize-none"
              />
            </div>
            <div>
              <label className="label">Supplier Lead Time (days)</label>
              <input type="number" value={leadTime} onChange={e => setLeadTime(e.target.value)} className="input-field" placeholder="3" />
            </div>
            <button onClick={handlePredict} disabled={aiLoading} className="btn-primary w-full flex items-center justify-center gap-2">
              <TrendingDown size={16} />
              {aiLoading ? 'Predicting...' : 'Generate Inventory Forecast'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
              <span className="text-xs font-bold text-brand-400">PNA</span>
            </div>
            <h3 className="text-slate-100 font-semibold text-sm">Agent Forecast</h3>
          </div>
          {aiLoading && <LoadingIndicator label="Calculating inventory forecast..." />}
          {aiError && <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-xl border border-red-500/30">{aiError}</div>}
          {aiResponse && (
            <div className="prose-industrial space-y-1 animate-fade-in max-h-80 overflow-y-auto">
              {formatAIResponse(aiResponse)}
            </div>
          )}
          {!aiLoading && !aiResponse && !aiError && (
            <div className="text-center py-8 text-slate-500 text-sm">
              Fill in the production plan and click Generate to get AI-powered reorder predictions.
            </div>
          )}
        </div>
      </div>

      {/* Transaction log */}
      <div className="card">
        <h3 className="text-slate-100 font-semibold mb-4">Transaction Log (Last 50)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs border-b border-slate-700">
                <th className="text-left py-2 pr-4">Timestamp</th>
                <th className="text-left py-2 pr-4">Item</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-left py-2 pr-4">Amount</th>
                <th className="text-left py-2">Reason / Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {log.length === 0 ? (
                <tr><td colSpan={5} className="text-slate-500 text-center py-6">No transactions yet.</td></tr>
              ) : log.map((entry, i) => (
                <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                  <td className="py-2 pr-4 text-slate-400 text-xs">{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className="py-2 pr-4 text-slate-200">{ICONS[entry.item]} {entry.item}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${entry.type === 'add' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {entry.type === 'add' ? '+Add' : '-Use'}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-slate-200 font-semibold">
                    {entry.type === 'add' ? '+' : '-'}{entry.amount}
                  </td>
                  <td className="py-2 text-slate-400 text-xs">{entry.reason || entry.supplier || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative card w-full max-w-md z-10 animate-fade-in">
            <h3 className="text-slate-100 font-bold text-lg mb-4">
              {modal.type === 'add' ? '+ Add Stock' : '- Record Consumption'} — {inventory[modal.item]?.label}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label">Amount ({inventory[modal.item]?.unit})</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input-field" placeholder="Enter amount..." autoFocus />
              </div>
              {modal.type === 'add' && (
                <div>
                  <label className="label">Supplier (optional)</label>
                  <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} className="input-field" placeholder="Supplier name..." />
                </div>
              )}
              <div>
                <label className="label">Reason / Notes</label>
                <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="input-field"
                  placeholder={modal.type === 'add' ? 'e.g. Delivery received' : 'e.g. Production use, shift 1'} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleTransaction} disabled={!amount} className="btn-primary flex-1">
                {modal.type === 'add' ? 'Add Stock' : 'Record Consumption'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
