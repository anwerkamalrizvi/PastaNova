// ============================================================
// USER-SCOPED localStorage HELPERS
// All keys prefixed with pasta_nova_{userId}_
// ============================================================

const KEY = (userId, type) => `pasta_nova_${userId}_${type}`;

// ── Settings ─────────────────────────────────────────────────
export function getSettings(userId) {
  try {
    const raw = localStorage.getItem(KEY(userId, 'settings'));
    return raw ? JSON.parse(raw) : getDefaultSettings();
  } catch { return getDefaultSettings(); }
}

export function saveSettings(userId, settings) {
  localStorage.setItem(KEY(userId, 'settings'), JSON.stringify(settings));
}

export function getDefaultSettings() {
  return {
    geminiApiKey: 'AIzaSyDdHbmf-UK3HPoFxM13jqQiX9clfoXME0k',
    googleClientId: '',
    companyName: 'Pasta Nova',
    extruderCapacity: 'medium',
    shiftTimes: { morning: '06:00', evening: '14:00', night: '22:00' },
    thresholds: {
      flour: { warning: 5000, critical: 2000 },
      gas: { warning: 200, critical: 50 },
      oil: { warning: 20, critical: 5 },
      packaging: { warning: 100, critical: 20 },
      additives: { warning: 50, critical: 10 },
    },
  };
}

// ── Machine Reading History ───────────────────────────────────
export function getMachineHistory(userId, machine) {
  try {
    const raw = localStorage.getItem(KEY(userId, `machine_${machine}`));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveMachineReading(userId, machine, reading) {
  const history = getMachineHistory(userId, machine);
  const entry = { ...reading, timestamp: new Date().toISOString(), id: Date.now() };
  const updated = [entry, ...history].slice(0, 30); // keep last 30
  localStorage.setItem(KEY(userId, `machine_${machine}`), JSON.stringify(updated));
  return entry;
}

export function getMachineLastReading(userId, machine) {
  const history = getMachineHistory(userId, machine);
  return history.length > 0 ? history[0] : null;
}

// ── Inventory ────────────────────────────────────────────────
export function getInventory(userId) {
  try {
    const raw = localStorage.getItem(KEY(userId, 'inventory'));
    return raw ? JSON.parse(raw) : getDefaultInventory();
  } catch { return getDefaultInventory(); }
}

export function getDefaultInventory() {
  return {
    flour:      { current: 10000, unit: 'kg', label: 'Semolina / Flour' },
    gas:        { current: 500,   unit: 'm³',   label: 'Natural Gas' },
    oil:        { current: 50,    unit: 'L',   label: 'Generator Oil' },
    packaging:  { current: 200,   unit: 'rolls', label: 'Packaging Film' },
    additives:  { current: 80,    unit: 'kg',  label: 'Color/Flavor Additives' },
  };
}

export function updateInventory(userId, inventory) {
  localStorage.setItem(KEY(userId, 'inventory'), JSON.stringify(inventory));
}

export function getInventoryLog(userId) {
  try {
    const raw = localStorage.getItem(KEY(userId, 'inventory_log'));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addInventoryLog(userId, entry) {
  const log = getInventoryLog(userId);
  const newEntry = { ...entry, timestamp: new Date().toISOString(), id: Date.now() };
  const updated = [newEntry, ...log].slice(0, 500);
  localStorage.setItem(KEY(userId, 'inventory_log'), JSON.stringify(updated));
  return newEntry;
}

// ── Chat History (persistent, cross-session) ─────────────────
export function getChatHistory(userId) {
  try {
    const raw = localStorage.getItem(KEY(userId, 'chat_history'));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveChatMessage(userId, message) {
  const history = getChatHistory(userId);
  const updated = [...history, message].slice(-200); // keep last 200
  localStorage.setItem(KEY(userId, 'chat_history'), JSON.stringify(updated));
}

export function clearChatHistory(userId) {
  localStorage.removeItem(KEY(userId, 'chat_history'));
}

// ── User Operational Profile ─────────────────────────────────
export function getUserProfile(userId) {
  try {
    const raw = localStorage.getItem(KEY(userId, 'profile'));
    return raw ? JSON.parse(raw) : getDefaultProfile();
  } catch { return getDefaultProfile(); }
}

export function getDefaultProfile() {
  return {
    extruderCapacity: null,
    shiftsPerDay: null,
    currentShape: null,
    certifications: [],
    commonIssues: [],
    avgDailyConsumption: null,
    primaryMarket: null,
    notes: [],
  };
}

export function updateUserProfile(userId, updates) {
  const current = getUserProfile(userId);
  const updated = { ...current, ...updates };
  localStorage.setItem(KEY(userId, 'profile'), JSON.stringify(updated));
  return updated;
}

// ── Production Logs ───────────────────────────────────────────
export function getProductionLogs(userId) {
  try {
    const raw = localStorage.getItem(KEY(userId, 'production_logs'));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addProductionLog(userId, log) {
  const logs = getProductionLogs(userId);
  const entry = { ...log, timestamp: new Date().toISOString(), id: Date.now() };
  const updated = [entry, ...logs].slice(0, 200);
  localStorage.setItem(KEY(userId, 'production_logs'), JSON.stringify(updated));
  return entry;
}

// ── Global App State (active line, shape) ────────────────────
export function getAppState(userId) {
  try {
    const raw = localStorage.getItem(KEY(userId, 'app_state'));
    return raw ? JSON.parse(raw) : { activeLine: 'Idle', activeShape: null, activeShift: null };
  } catch { return { activeLine: 'Idle', activeShape: null, activeShift: null }; }
}

export function saveAppState(userId, state) {
  localStorage.setItem(KEY(userId, 'app_state'), JSON.stringify(state));
}

// ── Clear All User Data ───────────────────────────────────────
export function clearAllUserData(userId) {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`pasta_nova_${userId}_`)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

// ── Auth (Google user, Client ID) ────────────────────────────
export function getAuthUser() {
  try {
    const raw = localStorage.getItem('pasta_nova_auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveAuthUser(user) {
  localStorage.setItem('pasta_nova_auth_user', JSON.stringify(user));
}

export function clearAuthUser() {
  localStorage.removeItem('pasta_nova_auth_user');
}

export function getGoogleClientId() {
  return localStorage.getItem('pasta_nova_google_client_id') || '';
}

export function saveGoogleClientId(id) {
  localStorage.setItem('pasta_nova_google_client_id', id);
}

// ── Burn Rate Calculation ────────────────────────────────────
export function calculateBurnRate(userId, item) {
  const log = getInventoryLog(userId);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recent = log.filter(e => e.item === item && e.type === 'consume' && e.timestamp >= sevenDaysAgo);
  const totalConsumed = recent.reduce((sum, e) => sum + (e.amount || 0), 0);
  return totalConsumed / 7; // daily burn rate
}
