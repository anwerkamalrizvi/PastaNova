import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Wrench, Package, MessageSquare,
  ClipboardList, BarChart3, TrendingUp, Settings,
  ChevronLeft, ChevronRight, LogOut, Menu, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'machine', label: 'Machine Monitor', icon: Wrench },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
  { id: 'production', label: 'Production', icon: ClipboardList },
  { id: 'sales', label: 'Sales & Marketing', icon: BarChart3 },
  { id: 'reports', label: 'Reports', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-700">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-brand-500/30">
            <span className="text-xl">🌾</span>
          </div>
          {!collapsed && (
            <div>
              <div className="text-brand-400 font-bold text-lg leading-none">PASTA NOVA</div>
              <div className="text-slate-500 text-xs tracking-widest">AGENT</div>
            </div>
          )}
        </div>

        {/* Agent status */}
        {!collapsed && (
          <div className="flex items-center gap-2 mt-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 agent-pulse" />
            <span className="text-emerald-400 text-xs font-semibold">AGENT ONLINE</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activePage === id;
          return (
            <button
              key={id}
              onClick={() => { onNavigate(id); setMobileOpen(false); }}
              className={`w-full text-left ${collapsed ? 'justify-center px-2' : ''} ${isActive ? 'nav-item-active' : 'nav-item'}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-brand-400' : ''}`} />
              {!collapsed && <span className="text-sm">{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User profile + clock */}
      <div className="border-t border-slate-700 px-3 py-4">
        {/* Clock */}
        {!collapsed && (
          <div className="mb-3 px-1">
            <div className="text-brand-400 font-mono text-sm font-semibold">{formatTime(time)}</div>
            <div className="text-slate-500 text-xs">{formatDate(time)}</div>
          </div>
        )}

        {/* User */}
        {user && (
          <div className={`flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors ${collapsed ? 'justify-center' : ''}`}>
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full flex-shrink-0 border-2 border-brand-500/30" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-400 text-xs font-bold">{user.name?.[0] || 'U'}</span>
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 text-xs font-semibold truncate">{user.givenName || user.name}</div>
                <div className="text-slate-500 text-xs truncate">{user.email}</div>
              </div>
            )}
            {!collapsed && (
              <button onClick={signOut} title="Sign Out" className="text-slate-500 hover:text-red-400 transition-colors p-1">
                <LogOut size={14} />
              </button>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="mt-2 w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={`hidden lg:flex flex-col bg-slate-800 border-r border-slate-700 h-screen flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}
        style={{ position: 'sticky', top: 0 }}
      >
        <NavContent />
      </div>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-brand-400 shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-slate-800 border-r border-slate-700 h-full z-10">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X size={20} />
            </button>
            <NavContent />
          </div>
        </div>
      )}
    </>
  );
}
