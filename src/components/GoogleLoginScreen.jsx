import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function GoogleLoginScreen() {
  const { signIn, googleClientId } = useAuth();
  const btnRef = useRef(null);

  useEffect(() => {
    if (!googleClientId || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: signIn,
      auto_select: false,
    });
    window.google.accounts.id.renderButton(btnRef.current, {
      theme: 'filled_black',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: 300,
    });
  }, [googleClientId, signIn]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-600/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/3 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

      <div className="relative z-10 text-center px-8">
        {/* Logo */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
              <span className="text-3xl">🌾</span>
            </div>
          </div>
          <h1 className="text-5xl font-bold text-slate-50 mb-1">
            PASTA <span className="text-brand-400">NOVA</span>
          </h1>
          <p className="text-brand-400 font-semibold tracking-widest text-sm uppercase">Industrial AI Agent</p>
        </div>

        {/* Login card */}
        <div className="glass border border-slate-700 rounded-2xl p-10 w-full max-w-md mx-auto shadow-2xl">
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 agent-pulse" />
              <span className="text-emerald-400 text-sm font-semibold">AGENT ONLINE</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Welcome Back</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Sign in with your Google account to access the Pasta Nova Industrial AI Platform. Your data is securely isolated per account.
            </p>
          </div>

          {/* Google Sign-In Button */}
          <div className="flex justify-center mb-6">
            <div ref={btnRef} id="google-signin-btn" />
          </div>

          {/* Features */}
          <div className="border-t border-slate-700 pt-6 grid grid-cols-2 gap-3 text-left">
            {[
              { icon: '🔒', label: 'Secure per-user data' },
              { icon: '🧠', label: 'Persistent AI memory' },
              { icon: '📊', label: 'Machine analytics' },
              { icon: '🏭', label: 'Industrial intelligence' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-6 text-slate-600 text-xs">
          Pasta Nova Agent v1.0 — Powered by Gemini 2.5 Flash
        </p>
      </div>
    </div>
  );
}
