import React, { useState, useRef } from 'react';
import { Plus, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { addProductionLog, getProductionLogs, getSettings, getChatHistory, getUserProfile, saveAppState, getAppState } from '../utils/storage.js';
import { callPastanovaAgent } from '../services/geminiService.js';
import { getCurrentShift } from '../utils/alerts.js';
import LoadingIndicator from '../components/LoadingIndicator.jsx';

const PRODUCT_LINES = ['Pasta Line', 'Vermicelli Line', 'Both'];
const SHAPES = {
  'Pasta Line': ['Elbow', 'Shell', 'Twisted Elbow', 'Fuselli', 'Penne'],
  'Vermicelli Line': ['Vermicelli (Standard)', 'Cut Plain', 'Cut Roasted', 'Colored / Flavored'],
  'Both': ['Elbow', 'Shell', 'Twisted Elbow', 'Fuselli', 'Penne', 'Vermicelli (Standard)', 'Cut Plain', 'Cut Roasted', 'Colored / Flavored'],
};

function formatAI(text) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('►') || line.startsWith('YEAR') || line.match(/^\d+\./)) {
      return <div key={i} className="mt-3 font-semibold text-brand-300 text-sm">{line}</div>;
    }
    if (line.startsWith('—') || line.startsWith('•') || line.startsWith('-')) {
      return <div key={i} className="ml-3 text-slate-300 text-sm leading-relaxed">• {line.slice(1).trim()}</div>;
    }
    if (line.trim() === '') return <div key={i} className="h-1" />;
    return <div key={i} className="text-slate-300 text-sm leading-relaxed">{line}</div>;
  });
}

export default function Production() {
  const { user } = useAuth();
  const settings = user ? getSettings(user.id) : null;
  const [productLine, setProductLine] = useState('Pasta Line');
  const [shape, setShape] = useState('Elbow');
  const [targetKg, setTargetKg] = useState('');
  const [actualKg, setActualKg] = useState('');
  const [flour, setFlour] = useState('');
  const [hours, setHours] = useState('7.5');
  const [notes, setNotes] = useState('');
  const [aiPrompt, setAiPrompt] = useState('batch_optimizer');
  const [aiInput, setAiInput] = useState('');
  const [fromShape, setFromShape] = useState('Elbow');
  const [toShape, setToShape] = useState('Shell');
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const abortRef = useRef(null);

  const logs = user ? getProductionLogs(user.id).slice(0, 10) : [];
  const shift = getCurrentShift(settings?.shiftTimes);

  const handleLogShift = () => {
    if (!user || !targetKg) return;
    addProductionLog(user.id, { productLine, shape, targetKg: parseFloat(targetKg), actualKg: parseFloat(actualKg) || 0, flour: parseFloat(flour) || 0, hours: parseFloat(hours) || 7.5, notes, shift });
    saveAppState(user.id, { activeLine: productLine, activeShape: shape, activeShift: shift });
    setTargetKg(''); setActualKg(''); setFlour(''); setNotes('');
    alert('Production shift logged!');
  };

  const handleAsk = async () => {
    if (!user) return;
    setAiLoading(true);
    setAiResponse(null);
    setAiError(null);
    abortRef.current = new AbortController();

    let msg = '';
    if (aiPrompt === 'batch_optimizer') {
      msg = `Optimize the batch production plan for Pasta Nova. Available hours: ${hours || 7.5}. Flour stock available: ${flour || 'unknown'} kg. Active line: ${productLine}. Target output: ${targetKg || 'maximize'} kg. Current shift: ${shift}. ${aiInput}\n\nSuggest optimal shape sequence, expected output per shape, estimated waste, and gas consumption.`;
    } else if (aiPrompt === 'changeover') {
      msg = `Calculate the changeover plan for Pasta Nova switching from ${fromShape} to ${toShape}. Provide: estimated changeover time, flush waste estimate (kg), step-by-step SOP, and any special precautions needed.`;
    } else {
      msg = `Shift planning advice for Pasta Nova — ${productLine}, ${shape}, ${shift} shift. ${aiInput}`;
    }

    const result = await callPastanovaAgent({
      apiKey: settings?.geminiApiKey,
      userMessage: msg,
      conversationHistory: getChatHistory(user.id).slice(-30),
      department: 'Production',
      userProfile: getUserProfile(user.id),
      signal: abortRef.current.signal,
    });
    if (result.text) setAiResponse(result.text);
    else setAiError(result.error);
    setAiLoading(false);
  };

  return (
    <div className="p-6 space-y-6 page-enter">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Production Planning</h2>
        <p className="text-slate-400 text-sm mt-1">Log shifts, optimize batches, and calculate changeovers</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Shift Log Form */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">📋</span>
            <div>
              <h3 className="text-slate-100 font-bold">Log Production Shift</h3>
              <p className="text-slate-400 text-sm">{shift} Shift — {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Production Line</label>
                <select value={productLine} onChange={e => setProductLine(e.target.value)} className="select-field">
                  {PRODUCT_LINES.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Shape / Type</label>
                <select value={shape} onChange={e => setShape(e.target.value)} className="select-field">
                  {(SHAPES[productLine] || []).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Target Output (kg)</label>
                <input type="number" value={targetKg} onChange={e => setTargetKg(e.target.value)} className="input-field" placeholder="e.g. 3000" />
              </div>
              <div>
                <label className="label">Actual Output (kg)</label>
                <input type="number" value={actualKg} onChange={e => setActualKg(e.target.value)} className="input-field" placeholder="e.g. 2850" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Semolina Used (kg)</label>
                <input type="number" value={flour} onChange={e => setFlour(e.target.value)} className="input-field" placeholder="e.g. 3200" />
              </div>
              <div>
                <label className="label">Net Production Hours</label>
                <input type="number" value={hours} onChange={e => setHours(e.target.value)} className="input-field" placeholder="7.5" />
              </div>
            </div>
            <div>
              <label className="label">Notes / Issues</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="input-field resize-none" placeholder="Any notable events, quality issues, or observations..." />
            </div>
            <button onClick={handleLogShift} disabled={!targetKg} className="btn-primary w-full flex items-center justify-center gap-2">
              <Plus size={16} /> Log This Shift
            </button>
          </div>
        </div>

        {/* AI Planning Tools */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="text-slate-100 font-bold">AI Planning Assistant</h3>
              <p className="text-slate-400 text-sm">Batch optimizer & changeover calculator</p>
            </div>
          </div>

          {/* Tool selector */}
          <div className="flex gap-2 mb-4">
            {[
              { id: 'batch_optimizer', label: '📊 Batch Optimizer' },
              { id: 'changeover', label: '🔄 Changeover Calc' },
              { id: 'custom', label: '💬 Custom Query' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setAiPrompt(t.id)}
                className={`flex-1 text-xs px-3 py-2 rounded-lg border font-medium transition-all ${
                  aiPrompt === t.id ? 'bg-brand-500/20 border-brand-500/40 text-brand-300' : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {aiPrompt === 'batch_optimizer' && (
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Available Hours</label><input type="number" value={hours} onChange={e => setHours(e.target.value)} className="input-field" placeholder="7.5" /></div>
                <div><label className="label">Flour Stock (kg)</label><input type="number" value={flour} onChange={e => setFlour(e.target.value)} className="input-field" placeholder="e.g. 5000" /></div>
              </div>
              <div><label className="label">Additional Context</label><input type="text" value={aiInput} onChange={e => setAiInput(e.target.value)} className="input-field" placeholder="e.g. priority shapes, customer orders..." /></div>
            </div>
          )}

          {aiPrompt === 'changeover' && (
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">From Shape</label>
                  <select value={fromShape} onChange={e => setFromShape(e.target.value)} className="select-field">
                    {SHAPES['Both'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">To Shape</label>
                  <select value={toShape} onChange={e => setToShape(e.target.value)} className="select-field">
                    {SHAPES['Both'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {aiPrompt === 'custom' && (
            <div className="mb-4">
              <label className="label">Your Question</label>
              <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} rows={3} className="input-field resize-none" placeholder="Ask anything about production planning..." />
            </div>
          )}

          <button onClick={handleAsk} disabled={aiLoading} className="btn-primary w-full mb-4">
            {aiLoading ? 'Planning...' : '🤖 Get AI Recommendation'}
          </button>

          {aiLoading && <LoadingIndicator label="Generating production plan..." />}
          {aiError && <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-xl border border-red-500/30">{aiError}</div>}
          {aiResponse && (
            <div className="prose-industrial space-y-1 animate-fade-in max-h-64 overflow-y-auto">
              {formatAI(aiResponse)}
            </div>
          )}
        </div>
      </div>

      {/* Production Log */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-brand-400" />
          <h3 className="text-slate-100 font-semibold">Recent Production Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs border-b border-slate-700">
                <th className="text-left py-2 pr-4">Date / Shift</th>
                <th className="text-left py-2 pr-4">Line & Shape</th>
                <th className="text-left py-2 pr-4">Target</th>
                <th className="text-left py-2 pr-4">Actual</th>
                <th className="text-left py-2 pr-4">Efficiency</th>
                <th className="text-left py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {logs.length === 0 ? (
                <tr><td colSpan={6} className="text-slate-500 text-center py-6">No production logs yet. Log your first shift above.</td></tr>
              ) : logs.map((log, i) => {
                const eff = log.targetKg > 0 ? Math.round((log.actualKg / log.targetKg) * 100) : null;
                return (
                  <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-2 pr-4 text-slate-400 text-xs">{new Date(log.timestamp).toLocaleDateString()} · {log.shift}</td>
                    <td className="py-2 pr-4 text-slate-200">{log.productLine} · {log.shape}</td>
                    <td className="py-2 pr-4 text-slate-300">{log.targetKg?.toLocaleString()} kg</td>
                    <td className="py-2 pr-4 text-slate-300">{log.actualKg?.toLocaleString()} kg</td>
                    <td className="py-2 pr-4">
                      {eff !== null && (
                        <span className={`font-semibold ${eff >= 95 ? 'text-emerald-400' : eff >= 85 ? 'text-brand-400' : 'text-red-400'}`}>{eff}%</span>
                      )}
                    </td>
                    <td className="py-2 text-slate-500 text-xs truncate max-w-xs">{log.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
