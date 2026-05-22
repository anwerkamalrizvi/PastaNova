import React from 'react';
import { MessageSquare, Activity } from 'lucide-react';
import { getCurrentShift, getShiftColor } from '../utils/alerts.js';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  machine: 'Machine Monitor',
  inventory: 'Inventory Management',
  chat: 'AI Chat Assistant',
  production: 'Production Planning',
  sales: 'Sales & Marketing',
  reports: 'Reports & Analytics',
  settings: 'Settings',
};

export default function TopBar({ activePage, onNavigate, activeLine, activeShape, shiftTimes }) {
  const shift = getCurrentShift(shiftTimes);
  const shiftColor = getShiftColor(shift);

  return (
    <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 flex-shrink-0 glass sticky top-0 z-30">
      {/* Left: page title */}
      <div className="flex items-center gap-3">
        <div className="lg:block hidden">
          <h1 className="text-slate-100 font-bold text-lg">{PAGE_TITLES[activePage] || 'Dashboard'}</h1>
        </div>
        <div className="lg:hidden ml-10">
          <h1 className="text-slate-100 font-bold text-base">{PAGE_TITLES[activePage] || 'Dashboard'}</h1>
        </div>
      </div>

      {/* Center: production line indicator */}
      <div className="hidden md:flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-lg border border-slate-600">
          <Activity size={14} className="text-brand-400" />
          <span className="text-slate-300 text-xs font-medium">Line:</span>
          <span className={`text-xs font-bold ${activeLine === 'Idle' ? 'text-slate-500' : 'text-brand-400'}`}>
            {activeLine || 'Idle'}
          </span>
          {activeShape && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300 text-xs">{activeShape}</span>
            </>
          )}
        </div>
      </div>

      {/* Right: shift badge + ask agent button */}
      <div className="flex items-center gap-3">
        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${shiftColor}`}>
          <span>
            {shift === 'Morning' ? '☀️' : shift === 'Evening' ? '🌆' : '🌙'}
          </span>
          <span>{shift} Shift</span>
        </div>

        <button
          onClick={() => onNavigate('chat')}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-slate-900 font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 text-sm shadow-md shadow-brand-500/20"
        >
          <MessageSquare size={14} />
          <span className="hidden sm:inline">Ask Agent</span>
        </button>
      </div>
    </div>
  );
}
