import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getSettings, getChatHistory, getUserProfile } from '../utils/storage.js';
import { callPastanovaAgent, generateExportBrief } from '../services/geminiService.js';
import LoadingIndicator from '../components/LoadingIndicator.jsx';

const PRODUCTS = ['Elbow Pasta', 'Shell Pasta', 'Twisted Elbow Pasta', 'Fuselli Pasta', 'Penne Pasta', 'Vermicelli (Standard)', 'Cut Plain Vermicelli', 'Cut Roasted Vermicelli', 'Colored Flavored Vermicelli'];
const COUNTRIES = ['UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Kenya', 'Tanzania', 'UK', 'Germany', 'France', 'Canada', 'Australia', 'USA', 'Other'];
const CERTIFICATIONS = ['Halal (PSQCA)', 'Halal (IFANCA)', 'ISO 22000', 'FSSC 22000', 'HACCP', 'BRC Grade A', 'PSQCA Mark', 'CFIA', 'FSANZ', 'None currently'];

function formatAI(text) {
  return text.split('\n').map((line, i) => {
    if (/^\d+\./.test(line) || line.startsWith('►') || line.startsWith('YEAR') || line.startsWith('##')) {
      return <div key={i} className="mt-3 font-semibold text-brand-300 text-sm">{line.replace(/^##\s*/, '')}</div>;
    }
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return <div key={i} className="ml-3 text-slate-300 text-sm leading-relaxed">• {line.slice(2)}</div>;
    }
    if (line.trim() === '') return <div key={i} className="h-1.5" />;
    return <div key={i} className="text-slate-300 text-sm leading-relaxed">{line}</div>;
  });
}

export default function SalesMarketing() {
  const { user } = useAuth();
  const settings = user ? getSettings(user.id) : null;
  const [activeTab, setActiveTab] = useState('export');

  // Export Advisor state
  const [country, setCountry] = useState('UAE');
  const [product, setProduct] = useState('Vermicelli (Standard)');
  const [capacity, setCapacity] = useState('');
  const [price, setPrice] = useState('');
  const [certs, setCerts] = useState([]);
  const [exportResponse, setExportResponse] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Demand forecast state
  const [forecastInput, setForecastInput] = useState('');
  const [forecastResponse, setForecastResponse] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(null);

  // Marketing ideas state
  const [marketingSegment, setMarketingSegment] = useState('');
  const [marketingResponse, setMarketingResponse] = useState(null);
  const [marketingLoading, setMarketingLoading] = useState(false);

  // Pricing state
  const [cogsPct, setCogsPct] = useState('');
  const [marginTarget, setMarginTarget] = useState('');
  const [pricingProduct, setPricingProduct] = useState('Elbow Pasta');
  const [pricingResponse, setPricingResponse] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  const abortRef = useRef(null);

  const callAI = async (msg, dept, setLoading, setResponse, setError) => {
    setLoading(true);
    if (setError) setError(null);
    abortRef.current = new AbortController();
    const result = await callPastanovaAgent({
      apiKey: settings?.geminiApiKey,
      userMessage: msg,
      conversationHistory: getChatHistory(user?.id || '').slice(-20),
      department: dept,
      userProfile: getUserProfile(user?.id || ''),
      signal: abortRef.current.signal,
    });
    if (result.text) setResponse(result.text);
    else if (setError) setError(result.error);
    setLoading(false);
  };

  const handleExport = async () => {
    setExportLoading(true);
    setExportResponse(null);
    setExportError(null);
    abortRef.current = new AbortController();
    const result = await generateExportBrief({
      apiKey: settings?.geminiApiKey,
      country,
      product,
      capacityKg: capacity,
      pricePerKg: price,
      certifications: certs.join(', ') || 'None',
      conversationHistory: getChatHistory(user?.id || '').slice(-20),
      userProfile: getUserProfile(user?.id || ''),
      signal: abortRef.current.signal,
    });
    if (result.text) setExportResponse(result.text);
    else setExportError(result.error);
    setExportLoading(false);
  };

  const handleForecast = () => {
    const msg = `Generate a demand forecast for Pasta Nova based on the following context:\n${forecastInput}\n\nConsider seasonal patterns (Ramadan, Eid, winter cooking), current market trends, and our product mix (pasta + vermicelli). Provide month-by-month demand outlook for the next 3 months, highlighting peak opportunities and recommended stock levels.`;
    callAI(msg, 'Sales', setForecastLoading, setForecastResponse, setForecastError);
  };

  const handleMarketing = () => {
    const msg = `Generate 3 creative and actionable marketing campaign ideas for Pasta Nova targeting: ${marketingSegment}. For each idea, include: campaign concept, key message, channels to use, estimated cost level (Low/Medium/High), and expected reach. Focus on our strengths: dual-line capability (pasta + vermicelli), Ramadan/Eid angle for vermicelli, and Pakistani craftsmanship.`;
    callAI(msg, 'Marketing', setMarketingLoading, setMarketingResponse, null);
  };

  const handlePricing = () => {
    const msg = `Help calculate optimal pricing for ${pricingProduct} at Pasta Nova. COGS as % of price: ${cogsPct}%. Target gross margin: ${marginTarget}%. Using the pricing formula: Factory gate = COGS ÷ (1 - target margin), calculate and recommend: factory gate price, distributor price, retail shelf price, and export FOB price. Also advise on pricing strategy for Ramadan season and bulk orders.`;
    callAI(msg, 'Sales', setPricingLoading, setPricingResponse, null);
  };

  const TABS = [
    { id: 'export', label: '🌍 Export Advisor' },
    { id: 'forecast', label: '📈 Demand Forecast' },
    { id: 'marketing', label: '📣 Marketing Ideas' },
    { id: 'pricing', label: '💰 Pricing Strategy' },
  ];

  return (
    <div className="p-6 space-y-6 page-enter">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Sales & Marketing</h2>
        <p className="text-slate-400 text-sm mt-1">Export strategy, demand forecasting, pricing, and marketing intelligence</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
              activeTab === t.id ? 'bg-brand-500/20 border-brand-500/40 text-brand-300' : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Export Advisor */}
      {activeTab === 'export' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-slate-100 font-bold mb-4">Export Market Entry Brief</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Target Country</label>
                  <select value={country} onChange={e => setCountry(e.target.value)} className="select-field">
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Product to Export</label>
                  <select value={product} onChange={e => setProduct(e.target.value)} className="select-field">
                    {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Monthly Capacity (kg)</label>
                  <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} className="input-field" placeholder="e.g. 50000" />
                </div>
                <div>
                  <label className="label">Factory Gate Price (per kg)</label>
                  <input type="text" value={price} onChange={e => setPrice(e.target.value)} className="input-field" placeholder="e.g. $0.85 or PKR 240" />
                </div>
              </div>
              <div>
                <label className="label">Certifications Currently Held</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {CERTIFICATIONS.map(c => (
                    <label key={c} className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-slate-100">
                      <input type="checkbox" checked={certs.includes(c)} onChange={e => {
                        if (e.target.checked) setCerts(prev => [...prev, c]);
                        else setCerts(prev => prev.filter(x => x !== c));
                      }} className="accent-brand-500" />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={handleExport} disabled={exportLoading} className="btn-primary w-full">
                🌍 {exportLoading ? 'Generating Brief...' : 'Generate Export Market Brief'}
              </button>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
                <span className="text-xs font-bold text-brand-400">PNA</span>
              </div>
              <h3 className="text-slate-100 font-semibold text-sm">Export Intelligence Report</h3>
            </div>
            {exportLoading && <LoadingIndicator label="Analyzing export market..." />}
            {exportError && <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-xl border border-red-500/30">{exportError}</div>}
            {exportResponse && (
              <div className="prose-industrial animate-fade-in max-h-[500px] overflow-y-auto">{formatAI(exportResponse)}</div>
            )}
            {!exportLoading && !exportResponse && !exportError && (
              <div className="text-center py-12 text-slate-500 text-sm">Fill in the export details and generate a comprehensive market entry brief.</div>
            )}
          </div>
        </div>
      )}

      {/* Demand Forecast */}
      {activeTab === 'forecast' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-slate-100 font-bold mb-4">Demand Forecast Generator</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Current Context (sales data, market conditions)</label>
                <textarea value={forecastInput} onChange={e => setForecastInput(e.target.value)} rows={5} className="input-field resize-none"
                  placeholder="e.g. Current month: May. Last month sales: 5000kg pasta, 8000kg vermicelli. Ramadan is 3 months away. We are selling mainly in Karachi and Lahore wholesale market. Main competitor dropped price by 5%..." />
              </div>
              <button onClick={handleForecast} disabled={forecastLoading || !forecastInput} className="btn-primary w-full">
                📈 {forecastLoading ? 'Forecasting...' : 'Generate Demand Forecast'}
              </button>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
                <span className="text-xs font-bold text-brand-400">PNA</span>
              </div>
              <h3 className="text-slate-100 font-semibold text-sm">Demand Forecast</h3>
            </div>
            {forecastLoading && <LoadingIndicator label="Analyzing demand patterns..." />}
            {forecastError && <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-xl border border-red-500/30">{forecastError}</div>}
            {forecastResponse && <div className="prose-industrial animate-fade-in max-h-[500px] overflow-y-auto">{formatAI(forecastResponse)}</div>}
            {!forecastLoading && !forecastResponse && !forecastError && (
              <div className="text-center py-12 text-slate-500 text-sm">Provide your current sales context to get an AI-powered demand forecast.</div>
            )}
          </div>
        </div>
      )}

      {/* Marketing Ideas */}
      {activeTab === 'marketing' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-slate-100 font-bold mb-4">Marketing Campaign Generator</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Target Segment</label>
                <input type="text" value={marketingSegment} onChange={e => setMarketingSegment(e.target.value)} className="input-field"
                  placeholder="e.g. Ramadan shoppers, wholesale distributors, Eid gift buyers, families in Karachi..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['Ramadan vermicelli buyers', 'Wholesale distributors', 'Eid gift shoppers', 'Family bulk buyers', 'GCC export market', 'Premium restaurant buyers'].map(seg => (
                  <button key={seg} onClick={() => setMarketingSegment(seg)} className="text-xs px-3 py-2 bg-slate-700 border border-slate-600 hover:border-brand-500/40 text-slate-400 hover:text-brand-300 rounded-lg transition-all">
                    {seg}
                  </button>
                ))}
              </div>
              <button onClick={handleMarketing} disabled={marketingLoading || !marketingSegment} className="btn-primary w-full">
                📣 {marketingLoading ? 'Generating...' : 'Generate Campaign Ideas'}
              </button>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
                <span className="text-xs font-bold text-brand-400">PNA</span>
              </div>
              <h3 className="text-slate-100 font-semibold text-sm">Campaign Ideas</h3>
            </div>
            {marketingLoading && <LoadingIndicator label="Creating marketing ideas..." />}
            {marketingResponse && <div className="prose-industrial animate-fade-in max-h-[500px] overflow-y-auto">{formatAI(marketingResponse)}</div>}
            {!marketingLoading && !marketingResponse && <div className="text-center py-12 text-slate-500 text-sm">Enter your target segment to get AI-generated marketing campaign ideas.</div>}
          </div>
        </div>
      )}

      {/* Pricing Strategy */}
      {activeTab === 'pricing' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-slate-100 font-bold mb-4">Pricing Strategy Calculator</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Product</label>
                <select value={pricingProduct} onChange={e => setPricingProduct(e.target.value)} className="select-field">
                  {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">COGS (% of selling price)</label>
                  <input type="number" value={cogsPct} onChange={e => setCogsPct(e.target.value)} className="input-field" placeholder="e.g. 65" />
                  <p className="text-slate-500 text-xs mt-1">Semolina 65-70% typical</p>
                </div>
                <div>
                  <label className="label">Target Gross Margin (%)</label>
                  <input type="number" value={marginTarget} onChange={e => setMarginTarget(e.target.value)} className="input-field" placeholder="e.g. 30" />
                  <p className="text-slate-500 text-xs mt-1">Local retail: 25-35%</p>
                </div>
              </div>
              {/* Market benchmarks */}
              <div className="p-4 bg-slate-700/50 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs font-semibold mb-2">Margin Benchmarks:</p>
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between"><span>Local retail</span><span className="text-emerald-400">25–35%</span></div>
                  <div className="flex justify-between"><span>Wholesale / distributor</span><span className="text-brand-400">15–22%</span></div>
                  <div className="flex justify-between"><span>Export market</span><span className="text-blue-400">30–45%</span></div>
                </div>
              </div>
              <button onClick={handlePricing} disabled={pricingLoading || !cogsPct || !marginTarget} className="btn-primary w-full">
                💰 {pricingLoading ? 'Calculating...' : 'Generate Pricing Strategy'}
              </button>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
                <span className="text-xs font-bold text-brand-400">PNA</span>
              </div>
              <h3 className="text-slate-100 font-semibold text-sm">Pricing Recommendation</h3>
            </div>
            {pricingLoading && <LoadingIndicator label="Calculating optimal pricing..." />}
            {pricingResponse && <div className="prose-industrial animate-fade-in max-h-[500px] overflow-y-auto">{formatAI(pricingResponse)}</div>}
            {!pricingLoading && !pricingResponse && <div className="text-center py-12 text-slate-500 text-sm">Enter COGS and target margin to get AI pricing recommendations.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
