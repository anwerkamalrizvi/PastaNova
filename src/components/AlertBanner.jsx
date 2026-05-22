import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function AlertBanner({ alerts, onDismiss }) {
  if (!alerts || alerts.length === 0) return null;

  const criticals = alerts.filter(a => a.status === 'critical');
  const warnings = alerts.filter(a => a.status === 'warning');

  return (
    <div className="animate-slide-down">
      {criticals.map((alert, i) => (
        <div key={`critical-${i}`} className="flex items-center gap-3 px-6 py-3 bg-red-500/15 border-b border-red-500/30">
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 animate-pulse">
            <AlertTriangle size={11} className="text-white" />
          </div>
          <span className="text-red-400 font-semibold text-sm flex-1">
            🔴 CRITICAL: {alert.machine} — {alert.issues?.[0] || 'Critical threshold exceeded'}
          </span>
          <button onClick={() => onDismiss(alert.machine)} className="text-red-400/60 hover:text-red-400 transition-colors ml-auto">
            <X size={16} />
          </button>
        </div>
      ))}
      {warnings.map((alert, i) => (
        <div key={`warning-${i}`} className="flex items-center gap-3 px-6 py-2 bg-brand-500/10 border-b border-brand-500/20">
          <AlertTriangle size={14} className="text-brand-400 flex-shrink-0" />
          <span className="text-brand-300 text-sm flex-1">
            🟡 WARNING: {alert.machine} — {alert.issues?.[0] || 'Parameter above normal range'}
          </span>
          <button onClick={() => onDismiss(alert.machine)} className="text-brand-400/60 hover:text-brand-400 transition-colors ml-auto">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
