import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Trash2, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getChatHistory, saveChatMessage, clearChatHistory, getSettings, getUserProfile, updateUserProfile } from '../utils/storage.js';
import { callPastanovaAgent } from '../services/geminiService.js';
import LoadingIndicator from '../components/LoadingIndicator.jsx';

const DEPARTMENTS = ['Production', 'Quality Control', 'Inventory', 'Sales', 'Marketing', 'Management', 'Export'];

const QUICK_CHIPS = [
  { label: '🔧 Diagnose my extruder', text: 'Can you help me diagnose potential issues with my extruder based on what you know about our operation?' },
  { label: '📦 Stock status today', text: "What's our current inventory status and which items should I be concerned about?" },
  { label: '📋 Optimal batch sequence', text: 'What is the optimal batch production sequence for today based on our typical operations?' },
  { label: '🌍 Export market advice', text: 'Give me advice on the best export market we should target first for our products.' },
  { label: '📊 Weekly production summary', text: 'Give me a framework for reviewing this week\'s production performance.' },
  { label: '🌾 Which shape to run first?', text: 'Which pasta shape should we run first in today\'s shift and why?' },
  { label: '🛠 Maintenance checklist', text: 'What maintenance should I prioritize this week based on our machine schedule?' },
  { label: '💧 Dryer high moisture help', text: 'My dryer is showing high final moisture readings. What should I check?' },
];

function renderMessageContent(text) {
  const lines = text.split('\n');
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        if (line.startsWith('►') || line.startsWith('▶')) {
          return <div key={i} className="mt-3 font-semibold text-brand-300 text-sm">{line}</div>;
        }
        if (line.startsWith('🔴') || line.startsWith('🟡') || line.startsWith('🟢')) {
          return <div key={i} className="mt-2 font-bold">{line}</div>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <div key={i} className="font-semibold text-slate-200 mt-2">{line.replace(/\*\*/g, '')}</div>;
        }
        if (/^\*\*(.+)\*\*/.test(line)) {
          return <div key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-brand-300">$1</strong>') }} />;
        }
        if (line.match(/^\d+\./)) {
          return <div key={i} className="ml-2 text-sm leading-relaxed mt-1">• {line.replace(/^\d+\./, '').trim()}</div>;
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <div key={i} className="ml-2 text-sm leading-relaxed">• {line.slice(2)}</div>;
        }
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return <div key={i} className="text-sm leading-relaxed">{line}</div>;
      })}
    </div>
  );
}

export default function ChatAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [department, setDepartment] = useState('Production');
  const [loading, setLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const settings = user ? getSettings(user.id) : null;

  // Load persistent history on mount
  useEffect(() => {
    if (!user) return;
    const history = getChatHistory(user.id);
    if (history.length > 0) {
      // Convert stored format to display format
      const displayMessages = history.map((m, i) => ({
        id: i,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp || new Date().toISOString(),
        department: m.department || 'Production',
      }));
      setMessages(displayMessages);
    } else {
      // Welcome message
      setMessages([{
        id: 0,
        role: 'model',
        content: `Hello! I'm PASTA NOVA AGENT — your industrial AI system for Pasta Nova.\n\nI have full memory of all our previous conversations and I'm here to help with machine diagnosis, production planning, inventory management, quality control, sales strategy, and export planning.\n\nWhat department are you working in today, and what can I help you with?`,
        timestamp: new Date().toISOString(),
        department: 'Production',
      }]);
    }
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading || !user) return;
    const userMsg = { id: Date.now(), role: 'user', content: text.trim(), timestamp: new Date().toISOString(), department };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Save user message
    saveChatMessage(user.id, { role: 'user', content: text.trim(), department, timestamp: new Date().toISOString() });

    // Build history for API (exclude the welcome message to save tokens)
    const history = getChatHistory(user.id);
    const profile = getUserProfile(user.id);
    abortRef.current = new AbortController();

    const result = await callPastanovaAgent({
      apiKey: settings?.geminiApiKey,
      userMessage: text.trim(),
      conversationHistory: history.slice(-50),
      department,
      userProfile: profile,
      signal: abortRef.current.signal,
    });

    if (result.text) {
      const aiMsg = { id: Date.now() + 1, role: 'model', content: result.text, timestamp: new Date().toISOString(), department };
      setMessages(prev => [...prev, aiMsg]);
      saveChatMessage(user.id, { role: 'model', content: result.text, department, timestamp: new Date().toISOString() });
    } else if (result.error) {
      const errMsg = { id: Date.now() + 1, role: 'error', content: result.error, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, errMsg]);
    }
    setLoading(false);
    inputRef.current?.focus();
  }, [loading, user, department, settings]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClear = () => {
    if (!showClearConfirm) { setShowClearConfirm(true); return; }
    clearChatHistory(user.id);
    setMessages([]);
    setShowClearConfirm(false);
  };

  const timeAgo = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full page-enter" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-700 bg-slate-800/80 glass">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-500/20 border-2 border-brand-500/40 flex items-center justify-center">
              <span className="text-sm font-bold text-brand-400">PNA</span>
            </div>
            <div>
              <h2 className="text-slate-100 font-bold">PASTA NOVA AGENT</h2>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 agent-pulse" />
                <span className="text-emerald-400 text-xs font-semibold">ONLINE — Full memory active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Department selector */}
            <div className="relative">
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="select-field text-sm py-1.5 pl-3 pr-8 appearance-none"
              >
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <button
              onClick={handleClear}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                showClearConfirm
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'border-slate-600 text-slate-400 hover:text-red-400 hover:border-red-500/50'
              }`}
            >
              <Trash2 size={12} />
              {showClearConfirm ? 'Confirm Clear?' : 'Clear Chat'}
            </button>
            {showClearConfirm && (
              <button onClick={() => setShowClearConfirm(false)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
            )}
          </div>
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_CHIPS.map((chip, i) => (
            <button
              key={i}
              onClick={() => sendMessage(chip.text)}
              disabled={loading}
              className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-brand-500/40 text-slate-300 hover:text-brand-300 rounded-full transition-all duration-150 disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            {msg.role !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs font-bold text-brand-400">PNA</span>
              </div>
            )}
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-1 border-2 border-brand-500/30">
                {user?.picture ? (
                  <img src={user.picture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-brand-500/20 flex items-center justify-center">
                    <span className="text-brand-400 text-xs font-bold">{user?.name?.[0]}</span>
                  </div>
                )}
              </div>
            )}

            {/* Bubble */}
            <div className={`max-w-2xl ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              {msg.role === 'error' ? (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl rounded-tl-sm text-red-400 text-sm">
                  {msg.content}
                </div>
              ) : (
                <div className={`px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-sm'
                    : 'bg-slate-700 text-slate-100 rounded-tl-sm border border-slate-600'
                }`}>
                  {msg.role === 'model' ? renderMessageContent(msg.content) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className="text-slate-600 text-xs">{timeAgo(msg.timestamp)}</span>
                {msg.department && msg.role === 'model' && (
                  <span className="text-slate-600 text-xs">· {msg.department}</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <LoadingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-slate-700 bg-slate-800/80 glass">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask PASTA NOVA AGENT anything (${department} context)... Press Enter to send, Shift+Enter for new line`}
              rows={1}
              className="input-field resize-none max-h-32 overflow-y-auto"
              style={{ minHeight: '44px', paddingRight: '44px' }}
              disabled={loading}
            />
          </div>
          <div className="flex gap-2">
            {loading && (
              <button
                onClick={() => { abortRef.current?.abort(); setLoading(false); }}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="btn-primary px-4 py-2 flex items-center gap-2"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
        <p className="text-slate-600 text-xs mt-2 text-center">
          AI has full persistent memory • Gemini 2.5 Flash • Context: {department}
        </p>
      </div>
    </div>
  );
}
