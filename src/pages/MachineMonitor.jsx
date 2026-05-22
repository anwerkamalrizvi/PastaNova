import React, { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, Send, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getMachineHistory, saveMachineReading, getSettings, getChatHistory, saveChatMessage, getUserProfile } from '../utils/storage.js';
import { analyzeMachineReadings } from '../services/geminiService.js';
import { getCurrentShift } from '../utils/alerts.js';
import LoadingIndicator from '../components/LoadingIndicator.jsx';

const MACHINES = {
  extruder: {
    label: 'Extruder', icon: '⚙️',
    fields: [
      { id: 'zone1', label: 'Barrel Zone 1 Temp (°C)', type: 'number', placeholder: '35–45', hint: 'Normal: 35–45°C' },
      { id: 'zone2', label: 'Barrel Zone 2 Temp (°C)', type: 'number', placeholder: '40–50', hint: 'Normal: 40–50°C' },
      { id: 'zone3', label: 'Barrel Zone 3 Temp (°C)', type: 'number', placeholder: '45–55', hint: 'Normal: 45–55°C' },
      { id: 'dieTemp', label: 'Die Head Temp (°C)', type: 'number', placeholder: '40–50', hint: 'Normal: 40–50°C' },
      { id: 'diePressure', label: 'Die Pressure (bar)', type: 'number', placeholder: '80–130', hint: 'Normal: 80–130 bar' },
      { id: 'screwRpm', label: 'Screw RPM', type: 'number', placeholder: '15–40', hint: 'Shape-specific' },
      { id: 'motorCurrent', label: 'Motor Current (A)', type: 'number', placeholder: '35–65', hint: 'Normal: 35–65A' },
      { id: 'doughMoisture', label: 'Dough Moisture (%)', type: 'number', placeholder: '29–31', hint: 'Target: 29–31%' },
      { id: 'vacuumLevel', label: 'Vacuum Level (bar)', type: 'number', placeholder: '-0.6 to -0.8', hint: 'Optional' },
    ],
  },
  flourFeeder: {
    label: 'Flour Feeder', icon: '🌾',
    fields: [
      { id: 'feedRate', label: 'Feed Rate (kg/hr)', type: 'number', placeholder: '300–600', hint: 'Normal: 300–600 kg/hr' },
      { id: 'motorCurrent', label: 'Motor Current (A)', type: 'number', placeholder: '3.5–6.0', hint: 'Alarm if >7.0A' },
      { id: 'hopperFill', label: 'Hopper Fill Level (%)', type: 'number', placeholder: '0–100', hint: 'Alarm at <15%' },
    ],
  },
  electronicsPanel: {
    label: 'Electronics Panel', icon: '🖥️',
    fields: [
      { id: 'voltage', label: 'Supply Voltage (V)', type: 'number', placeholder: '380–400', hint: 'Normal: 380–400V' },
      { id: 'phase1', label: 'Phase 1 Current (A)', type: 'number', placeholder: '0', hint: 'Within nameplate ±10%' },
      { id: 'phase2', label: 'Phase 2 Current (A)', type: 'number', placeholder: '0', hint: 'Within nameplate ±10%' },
      { id: 'phase3', label: 'Phase 3 Current (A)', type: 'number', placeholder: '0', hint: 'Within nameplate ±10%' },
      { id: 'panelTemp', label: 'Panel Internal Temp (°C)', type: 'number', placeholder: '<45', hint: 'Max: 45°C' },
      { id: 'alarmCodes', label: 'Active Alarm Codes', type: 'text', placeholder: 'e.g. E001, E003 or None', hint: 'List any active alarms' },
      { id: 'plcStatus', label: 'PLC Status', type: 'select', options: ['Normal', 'Warning', 'Fault'], hint: 'Current PLC state' },
    ],
  },
  sensors: {
    label: 'Sensors', icon: '📡',
    fields: [
      { id: 'outOfCalibration', label: 'Sensors Out of Calibration', type: 'multicheck',
        options: ['Temperature Zone 1', 'Temperature Zone 2', 'Temperature Zone 3', 'Humidity Pre-Dryer', 'Humidity Dryer Zone 1', 'Pressure Transducer', 'Vibration Sensor', 'Motor Current Sensor'],
        hint: 'Check all that apply' },
      { id: 'unusualReadings', label: 'Unusual Readings Description', type: 'textarea', placeholder: 'Describe any unusual or erratic sensor behaviour...', hint: 'Describe anomalies' },
    ],
  },
  preDryer: {
    label: 'Pre-Dryer', icon: '💨',
    fields: [
      { id: 'inletTemp', label: 'Inlet Temperature (°C)', type: 'number', placeholder: '60–75', hint: 'Normal: 60–75°C' },
      { id: 'humidity', label: 'Relative Humidity (%)', type: 'number', placeholder: '75–85', hint: 'Normal: 75–85% RH' },
      { id: 'beltSpeed', label: 'Belt Speed Setting', type: 'text', placeholder: 'e.g. Low / Medium / High or numeric', hint: 'Current belt speed' },
      { id: 'productCondition', label: 'Product Visual Condition', type: 'select', options: ['Good', 'Sticking', 'Cracking'], hint: 'Visual inspection result' },
    ],
  },
  dryer: {
    label: 'Dryer (Multi-Zone)', icon: '🔥',
    fields: [
      { id: 'z1temp', label: 'Zone 1 Temperature (°C)', type: 'number', placeholder: '70–80', hint: 'Target: 70–80°C' },
      { id: 'z1rh', label: 'Zone 1 Humidity (% RH)', type: 'number', placeholder: '75–80', hint: 'Target: 75–80% RH' },
      { id: 'z2temp', label: 'Zone 2 Temperature (°C)', type: 'number', placeholder: '80–90', hint: 'Target: 80–90°C' },
      { id: 'z2rh', label: 'Zone 2 Humidity (% RH)', type: 'number', placeholder: '65–72', hint: 'Target: 65–72% RH' },
      { id: 'z3temp', label: 'Zone 3 Temperature (°C)', type: 'number', placeholder: '75–80', hint: 'Target: 75–80°C' },
      { id: 'z3rh', label: 'Zone 3 Humidity (% RH)', type: 'number', placeholder: '60–68', hint: 'Target: 60–68% RH' },
      { id: 'z4temp', label: 'Zone 4 Temperature (°C)', type: 'number', placeholder: '40–50', hint: 'Target: 40–50°C' },
      { id: 'z4rh', label: 'Zone 4 Humidity (% RH)', type: 'number', placeholder: '55–65', hint: 'Target: 55–65% RH' },
      { id: 'finalMoisture', label: 'Final Product Moisture (%)', type: 'number', placeholder: '12.0–12.5', hint: 'Target: 12.0–12.5%' },
      { id: 'productDefects', label: 'Observed Product Defects', type: 'textarea', placeholder: 'Describe any defects: cracks, sticking, colour issues...', hint: 'QC observations' },
    ],
  },
};

const PRODUCT_LINES = ['Pasta Line', 'Vermicelli Line'];
const SHAPES = {
  'Pasta Line': ['Elbow', 'Shell', 'Twisted Elbow', 'Fuselli', 'Penne'],
  'Vermicelli Line': ['Vermicelli (Standard)', 'Cut Plain', 'Cut Roasted', 'Colored / Flavored'],
};

function FieldInput({ field, value, onChange }) {
  if (field.type === 'select') {
    return (
      <select value={value || ''} onChange={e => onChange(field.id, e.target.value)} className="select-field">
        <option value="">Select...</option>
        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.type === 'textarea') {
    return (
      <textarea
        value={value || ''}
        onChange={e => onChange(field.id, e.target.value)}
        placeholder={field.placeholder}
        rows={3}
        className="input-field resize-none"
      />
    );
  }
  if (field.type === 'multicheck') {
    const checked = value || [];
    return (
      <div className="grid grid-cols-2 gap-2">
        {field.options.map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-slate-100">
            <input
              type="checkbox"
              checked={checked.includes(opt)}
              onChange={e => {
                if (e.target.checked) onChange(field.id, [...checked, opt]);
                else onChange(field.id, checked.filter(c => c !== opt));
              }}
              className="accent-brand-500 w-4 h-4"
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }
  return (
    <input
      type={field.type}
      value={value || ''}
      onChange={e => onChange(field.id, field.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
      placeholder={field.placeholder}
      className="input-field"
    />
  );
}

function formatAIResponse(text) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('►') || line.startsWith('▶')) {
      return <div key={i} className="mt-3 font-semibold text-brand-300">{line}</div>;
    }
    if (line.startsWith('🔴') || line.startsWith('🟡') || line.startsWith('🟢')) {
      return <div key={i} className="mt-2 font-bold text-base">{line}</div>;
    }
    if (line.startsWith('**') && line.endsWith('**')) {
      return <div key={i} className="font-semibold text-slate-200 mt-2">{line.replace(/\*\*/g, '')}</div>;
    }
    if (line.trim() === '') return <div key={i} className="h-1" />;
    return <div key={i} className="text-slate-300 text-sm leading-relaxed">{line}</div>;
  });
}

export default function MachineMonitor() {
  const { user } = useAuth();
  const [activeMachine, setActiveMachine] = useState('extruder');
  const [formData, setFormData] = useState({});
  const [productLine, setProductLine] = useState('Pasta Line');
  const [activeShape, setActiveShape] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef(null);

  const machine = MACHINES[activeMachine];
  const history = user ? getMachineHistory(user.id, activeMachine).slice(0, 5) : [];
  const settings = user ? getSettings(user.id) : null;

  const handleFieldChange = (id, val) => {
    setFormData(prev => ({ ...prev, [id]: val }));
  };

  const handleAnalyze = async () => {
    if (!user) return;
    setLoading(true);
    setAiResponse(null);
    setAiError(null);
    abortRef.current = new AbortController();

    // Save reading
    saveMachineReading(user.id, activeMachine, { data: formData, productLine, shape: activeShape });

    const chatHistory = getChatHistory(user.id);
    const userProfile = getUserProfile(user.id);
    const shift = getCurrentShift(settings?.shiftTimes);

    const result = await analyzeMachineReadings({
      apiKey: settings?.geminiApiKey,
      machine: machine.label,
      readings: formData,
      productLine,
      shape: activeShape,
      shift,
      conversationHistory: chatHistory,
      userProfile,
      signal: abortRef.current.signal,
    });

    if (result.text) {
      setAiResponse(result.text);
      // Save to persistent chat
      saveChatMessage(user.id, { role: 'user', content: `[Machine Monitor] Submitted ${machine.label} readings for analysis. Product: ${productLine}, Shape: ${activeShape}, Shift: ${shift}` });
      saveChatMessage(user.id, { role: 'model', content: result.text });
    } else if (result.error) {
      setAiError(result.error);
    }
    setLoading(false);
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  return (
    <div className="p-6 page-enter">
      {/* Machine tabs */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-100 mb-4">Machine Monitor</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(MACHINES).map(([id, m]) => (
            <button
              key={id}
              onClick={() => { setActiveMachine(id); setFormData({}); setAiResponse(null); setAiError(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-150 ${
                activeMachine === id
                  ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              <span>{m.icon}</span> {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{machine.icon}</span>
              <div>
                <h3 className="text-slate-100 font-bold text-lg">{machine.label}</h3>
                <p className="text-slate-400 text-sm">Enter current readings</p>
              </div>
            </div>
          </div>

          {/* Product line & shape */}
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-700">
            <div>
              <label className="label">Product Line</label>
              <select value={productLine} onChange={e => setProductLine(e.target.value)} className="select-field">
                {PRODUCT_LINES.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Active Shape / Type</label>
              <select value={activeShape} onChange={e => setActiveShape(e.target.value)} className="select-field">
                <option value="">Select shape...</option>
                {(SHAPES[productLine] || []).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Dynamic form fields */}
          <div className="space-y-4">
            {machine.fields.map(field => (
              <div key={field.id}>
                <div className="flex justify-between items-center mb-1">
                  <label className="label mb-0">{field.label}</label>
                  <span className="text-slate-600 text-xs italic">{field.hint}</span>
                </div>
                <FieldInput field={field} value={formData[field.id]} onChange={handleFieldChange} />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Send size={16} />
              {loading ? 'Analyzing...' : 'ANALYZE WITH PASTA NOVA AGENT'}
            </button>
            {loading && (
              <button onClick={handleCancel} className="btn-secondary px-4">Cancel</button>
            )}
          </div>
        </div>

        {/* AI Response */}
        <div className="space-y-4">
          <div className="card min-h-64">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
                <span className="text-xs font-bold text-brand-400">PNA</span>
              </div>
              <div>
                <h3 className="text-slate-100 font-semibold text-sm">PASTA NOVA AGENT Analysis</h3>
                <p className="text-slate-500 text-xs">Machine intelligence & diagnosis</p>
              </div>
            </div>

            {loading && <LoadingIndicator label="Analyzing machine readings..." />}

            {aiError && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {aiError}
              </div>
            )}

            {aiResponse && (
              <div className="prose-industrial space-y-1 animate-fade-in">
                {formatAIResponse(aiResponse)}
              </div>
            )}

            {!loading && !aiResponse && !aiError && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-4xl mb-3">{machine.icon}</span>
                <p className="text-slate-500 text-sm">Fill in the {machine.label} readings and click Analyze to get an AI diagnosis.</p>
              </div>
            )}
          </div>

          {/* History */}
          <div className="card">
            <button
              onClick={() => setShowHistory(h => !h)}
              className="w-full flex items-center justify-between text-slate-300 hover:text-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-brand-400" />
                <span className="font-semibold text-sm">Reading History (last 5)</span>
              </div>
              {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showHistory && (
              <div className="mt-4 space-y-3 animate-fade-in">
                {history.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">No history yet for this machine.</p>
                ) : (
                  history.map((entry, i) => (
                    <div key={i} className="p-3 bg-slate-700/50 rounded-xl border border-slate-700">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-400 text-xs">{new Date(entry.timestamp).toLocaleString()}</span>
                        <span className="text-slate-500 text-xs">{entry.shape || 'Unknown shape'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(entry.data || {}).slice(0, 6).map(([k, v]) => (
                          <div key={k} className="text-xs">
                            <span className="text-slate-500">{k}: </span>
                            <span className="text-slate-300 font-medium">{Array.isArray(v) ? v.join(', ') : v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
