import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { saveGoogleClientId } from '../utils/storage.js';

// Client ID extracted from the credentials JSON file
const DETECTED_CLIENT_ID = '296083258065-hpr8iup9otebv5m1dd3fbrn0g3elpmug.apps.googleusercontent.com';

export default function GoogleSetupScreen() {
  const { updateClientId } = useAuth();
  const [clientId, setClientId] = useState(DETECTED_CLIENT_ID);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState('fix'); // 'fix' | 'done'

  const handleSave = () => {
    if (!clientId.trim()) return;
    setSaving(true);
    saveGoogleClientId(clientId.trim());
    updateClientId(clientId.trim());
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
              <span className="text-2xl">🌾</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-50">
            PASTA <span className="text-brand-400">NOVA</span>
          </h1>
          <p className="text-brand-400 font-semibold tracking-widest text-sm">Industrial AI Agent</p>
        </div>

        {/* Error explanation */}
        <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🔴</span>
          <div>
            <p className="text-red-400 font-bold text-sm mb-1">Error 401: invalid_client — "no registered origin"</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your Client ID is correct, but <code className="bg-slate-700 text-brand-300 px-1 rounded">http://localhost:5173</code> is not added as an <strong className="text-slate-200">Authorized JavaScript Origin</strong> in Google Cloud Console. This is a 2-minute fix.
            </p>
          </div>
        </div>

        {/* Fix steps */}
        <div className="glass border border-slate-700 rounded-2xl p-7 shadow-2xl mb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-brand-500/20 rounded-xl flex items-center justify-center">
              <span className="text-lg">🔧</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Fix: Add Authorized Origin</h2>
              <p className="text-slate-400 text-xs">Takes ~2 minutes in Google Cloud Console</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {[
              {
                step: '1',
                text: 'Open Google Cloud Console',
                link: 'https://console.cloud.google.com/apis/credentials',
                linkText: 'console.cloud.google.com/apis/credentials',
              },
              {
                step: '2',
                text: 'Click your OAuth 2.0 Client ID:',
                code: '296083258065-hpr8iup9...googleusercontent.com',
              },
              {
                step: '3',
                text: 'Under "Authorized JavaScript origins" click + ADD URI',
                highlight: true,
              },
              {
                step: '4',
                text: 'Add this exact URI:',
                code: 'http://localhost:5173',
                copyable: true,
              },
              {
                step: '5',
                text: 'Click SAVE and wait ~1 minute for changes to apply.',
              },
              {
                step: '6',
                text: 'Come back here and click "Continue to Sign In" below.',
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-brand-400 text-xs font-bold">{item.step}</span>
                </div>
                <div className="flex-1">
                  <span className="text-slate-300 text-sm">{item.text}</span>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noreferrer"
                      className="ml-2 text-brand-400 text-xs underline hover:text-brand-300">
                      {item.linkText} ↗
                    </a>
                  )}
                  {item.code && (
                    <div className="mt-1 flex items-center gap-2">
                      <code className={`bg-slate-800 border px-3 py-1 rounded-lg text-sm font-mono ${item.copyable ? 'text-brand-300 border-brand-500/30' : 'text-slate-300 border-slate-700'}`}>
                        {item.code}
                      </code>
                      {item.copyable && (
                        <button
                          onClick={() => navigator.clipboard.writeText(item.code)}
                          className="text-xs text-slate-500 hover:text-brand-400 transition-colors border border-slate-700 hover:border-brand-500/40 px-2 py-1 rounded"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  )}
                  {item.highlight && (
                    <div className="mt-1 p-2 bg-brand-500/10 border border-brand-500/20 rounded-lg text-xs text-brand-300">
                      ⚠ This section is usually empty by default — that is the root cause of the error.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Client ID field — pre-filled */}
          <div className="mb-4 p-3 bg-slate-800 border border-slate-700 rounded-xl">
            <p className="text-slate-500 text-xs mb-2 font-semibold">✓ Client ID detected from your JSON file:</p>
            <code className="text-brand-300 text-xs font-mono break-all">{DETECTED_CLIENT_ID}</code>
          </div>

          <button
            onClick={handleSave}
            disabled={!clientId.trim() || saving}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {saving ? '⏳ Loading...' : '✓ I\'ve added the origin — Continue to Sign In →'}
          </button>
        </div>

        {/* Also need to use custom input */}
        <div className="glass border border-slate-700 rounded-xl p-4">
          <p className="text-slate-500 text-xs mb-2">Or enter a different Client ID:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              placeholder="xxxxxxxxxx.apps.googleusercontent.com"
              className="input-field font-mono text-xs flex-1"
            />
            <button onClick={handleSave} disabled={!clientId.trim() || saving} className="btn-secondary text-sm px-4 whitespace-nowrap">
              Use This
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
