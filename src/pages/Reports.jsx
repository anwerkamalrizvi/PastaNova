import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getMachineHistory, getInventoryLog, getProductionLogs, getSettings, getChatHistory, getUserProfile } from '../utils/storage.js';
import { calculateExtruderHealth, calculateDryerHealth } from '../utils/alerts.js';
import { callPastanovaAgent } from '../services/geminiService.js';
import LoadingIndicator from '../components/LoadingIndicator.jsx';

const CHART_COLORS = { brand: '#f59e0b', emerald: '#10b981', blue: '#3b82f6', red: '#ef4444', purple: '#a855f7' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function Reports() {
  const { user } = useAuth();
  const [machineHealthData, setMachineHealthData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [productionData, setProductionData] = useState([]);
  const [moistureData, setMoistureData] = useState([]);
  const [shiftSummary, setShiftSummary] = useState('');
  const [summaryResponse, setSummaryResponse] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const settings = user ? getSettings(user.id) : null;

  useEffect(() => {
    if (!user) return;

    // Machine health trend (from extruder history, last 30 entries)
    const extHistory = getMachineHistory(user.id, 'extruder');
    const dryerHistory = getMachineHistory(user.id, 'dryer');
    const healthData = extHistory.slice(0, 30).reverse().map((e, i) => {
      const extHealth = calculateExtruderHealth(e.data);
      const dryerEntry = dryerHistory[dryerHistory.length - 1 - i];
      const dryerHealth = calculateDryerHealth(dryerEntry?.data);
      return {
        date: new Date(e.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        extruder: extHealth.score,
        dryer: dryerHealth.score,
      };
    });
    if (healthData.length === 0) {
      // Generate sample data
      const now = Date.now();
      for (let i = 14; i >= 0; i--) {
        const d = new Date(now - i * 24 * 60 * 60 * 1000);
        healthData.push({
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          extruder: Math.round(75 + Math.random() * 20),
          dryer: Math.round(70 + Math.random() * 25),
        });
      }
    }
    setMachineHealthData(healthData);

    // Inventory trend (from logs)
    const invLog = getInventoryLog(user.id);
    const today = Date.now();
    const invTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayLogs = invLog.filter(l => new Date(l.timestamp).toDateString() === d.toDateString());
      const flourDelta = dayLogs.filter(l => l.item === 'flour').reduce((s, l) => l.type === 'add' ? s + l.amount : s - l.amount, 0);
      invTrend.push({
        date: key,
        flour: Math.max(0, 10000 + flourDelta),
        gas: Math.max(0, 500 + dayLogs.filter(l => l.item === 'gas').reduce((s, l) => l.type === 'add' ? s + l.amount : s - l.amount, 0)),
      });
    }
    setInventoryData(invTrend);

    // Production output vs target (last 7 shifts)
    const prodLogs = getProductionLogs(user.id).slice(0, 7).reverse();
    const prodData = prodLogs.length > 0 ? prodLogs.map(l => ({
      date: new Date(l.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      target: l.targetKg || 0,
      actual: l.actualKg || 0,
      efficiency: l.targetKg > 0 ? Math.round((l.actualKg / l.targetKg) * 100) : 0,
    })) : [
      { date: 'Mon', target: 3000, actual: 2850, efficiency: 95 },
      { date: 'Tue', target: 3000, actual: 3100, efficiency: 103 },
      { date: 'Wed', target: 2500, actual: 2300, efficiency: 92 },
      { date: 'Thu', target: 3000, actual: 2950, efficiency: 98 },
      { date: 'Fri', target: 3000, actual: 3050, efficiency: 102 },
      { date: 'Sat', target: 2000, actual: 1800, efficiency: 90 },
      { date: 'Sun', target: 2000, actual: 2100, efficiency: 105 },
    ];
    setProductionData(prodData);

    // Dryer moisture trend (scatter)
    const mData = dryerHistory.slice(0, 20).reverse().map((e, i) => ({
      reading: i + 1,
      moisture: e.data?.finalMoisture || (12 + (Math.random() - 0.5) * 1.5).toFixed(1),
    }));
    if (mData.length === 0) {
      for (let i = 1; i <= 15; i++) {
        mData.push({ reading: i, moisture: parseFloat((12 + (Math.random() - 0.5) * 2).toFixed(2)) });
      }
    }
    setMoistureData(mData);
  }, [user]);

  const handleShiftSummary = async () => {
    if (!shiftSummary.trim() || !user) return;
    setSummaryLoading(true);
    setSummaryResponse(null);
    setSummaryError(null);
    const msg = `The operator has submitted the following end-of-shift notes at Pasta Nova:\n\n"${shiftSummary}"\n\nPlease format this as a structured shift summary card including:\n► SHIFT OVERVIEW\n► PRODUCTION PERFORMANCE\n► MACHINE STATUS HIGHLIGHTS\n► QUALITY OBSERVATIONS\n► ACTION ITEMS FOR NEXT SHIFT\n► OVERALL SHIFT RATING: EXCELLENT / GOOD / FAIR / POOR`;
    const result = await callPastanovaAgent({
      apiKey: settings?.geminiApiKey,
      userMessage: msg,
      conversationHistory: getChatHistory(user.id).slice(-10),
      department: 'Production',
      userProfile: getUserProfile(user.id),
    });
    if (result.text) setSummaryResponse(result.text);
    else setSummaryError(result.error);
    setSummaryLoading(false);
  };

  const formatSummary = (text) => text.split('\n').map((line, i) => {
    if (line.startsWith('►')) return <div key={i} className="mt-3 font-semibold text-brand-300">{line}</div>;
    if (line.includes('EXCELLENT')) return <div key={i} className="mt-2 text-emerald-400 font-bold">{line}</div>;
    if (line.includes('GOOD')) return <div key={i} className="mt-2 text-brand-400 font-bold">{line}</div>;
    if (line.includes('FAIR') || line.includes('POOR')) return <div key={i} className="mt-2 text-red-400 font-bold">{line}</div>;
    if (line.trim() === '') return <div key={i} className="h-1" />;
    return <div key={i} className="text-slate-300 text-sm">{line}</div>;
  });

  return (
    <div className="p-6 space-y-6 page-enter">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Reports & Analytics</h2>
        <p className="text-slate-400 text-sm mt-1">Machine health trends, inventory levels, production performance, and moisture analysis</p>
      </div>

      {/* Machine Health Trend */}
      <div className="card">
        <h3 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-brand-500 inline-block" />
          Machine Health Score Trend (30-Day)
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={machineHealthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            <Line type="monotone" dataKey="extruder" stroke={CHART_COLORS.brand} strokeWidth={2} dot={false} name="Extruder Health %" />
            <Line type="monotone" dataKey="dryer" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} name="Dryer Health %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Inventory Levels */}
      <div className="card">
        <h3 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
          Inventory Levels — Last 7 Days
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={inventoryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            <Area type="monotone" dataKey="flour" stroke={CHART_COLORS.brand} fill={CHART_COLORS.brand + '20'} strokeWidth={2} name="Flour (kg)" />
            <Area type="monotone" dataKey="gas" stroke={CHART_COLORS.blue} fill={CHART_COLORS.blue + '15'} strokeWidth={2} name="Gas (m³)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Production Output vs Target */}
      <div className="card">
        <h3 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
          Production Output vs Target (kg)
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={productionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            <Bar dataKey="target" fill="#334155" name="Target (kg)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" fill={CHART_COLORS.brand} name="Actual (kg)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Dryer Moisture Scatter */}
      <div className="card">
        <h3 className="text-slate-100 font-semibold mb-2 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
          Dryer Final Moisture Readings (% per reading)
        </h3>
        <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Target: 12.0–12.5%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Limit: 13.0%</span>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="reading" name="Reading #" tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Reading #', fill: '#64748b', fontSize: 11, position: 'insideBottom', offset: -2 }} />
            <YAxis dataKey="moisture" domain={[10, 14]} name="Moisture %" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
            <Scatter data={moistureData} fill={CHART_COLORS.purple} name="Moisture %" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Shift Summary AI */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-slate-100 font-semibold mb-4">🗒 AI Shift Summary Generator</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Operator Shift Notes</label>
              <textarea
                value={shiftSummary}
                onChange={e => setShiftSummary(e.target.value)}
                rows={6}
                className="input-field resize-none"
                placeholder="Type your end-of-shift notes here... e.g. Ran Elbow pasta morning shift, 2800kg actual vs 3000kg target. Extruder pressure spiked to 125 bar twice. QC moisture readings all within 12.2–12.4%. Dryer Zone 2 temp was slightly low at 78°C. No major issues. Next shift: switching to Shell."
              />
            </div>
            <button onClick={handleShiftSummary} disabled={summaryLoading || !shiftSummary.trim()} className="btn-primary w-full">
              📊 {summaryLoading ? 'Generating Summary...' : 'Generate AI Shift Summary'}
            </button>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
              <span className="text-xs font-bold text-brand-400">PNA</span>
            </div>
            <h3 className="text-slate-100 font-semibold text-sm">Formatted Shift Summary</h3>
          </div>
          {summaryLoading && <LoadingIndicator label="Formatting shift summary..." />}
          {summaryError && <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-xl border border-red-500/30">{summaryError}</div>}
          {summaryResponse && (
            <div className="prose-industrial animate-fade-in max-h-80 overflow-y-auto">{formatSummary(summaryResponse)}</div>
          )}
          {!summaryLoading && !summaryResponse && !summaryError && (
            <div className="text-center py-12 text-slate-500 text-sm">Enter your shift notes and the AI will format them into a professional shift summary card.</div>
          )}
        </div>
      </div>
    </div>
  );
}
