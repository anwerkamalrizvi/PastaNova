import React from 'react';

export default function LoadingIndicator({ label = 'PASTA NOVA AGENT is thinking...' }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-brand-400">PNA</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-700 rounded-2xl rounded-tl-sm">
        <div className="flex gap-1 items-center">
          <div className="w-2 h-2 rounded-full bg-brand-400 typing-dot" />
          <div className="w-2 h-2 rounded-full bg-brand-400 typing-dot" />
          <div className="w-2 h-2 rounded-full bg-brand-400 typing-dot" />
        </div>
        <span className="text-slate-400 text-xs ml-1">{label}</span>
      </div>
    </div>
  );
}
