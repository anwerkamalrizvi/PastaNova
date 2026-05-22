// ============================================================
// ALERTS & HEALTH SCORE UTILITIES
// ============================================================

// ── Machine Health Score Algorithm ───────────────────────────
export function calculateExtruderHealth(readings) {
  let score = 100;
  if (!readings) return { score: 0, status: 'unknown', issues: [] };
  const issues = [];

  const { zone1, zone2, zone3, dieTemp, diePressure, screwRpm, motorCurrent, doughMoisture } = readings;

  if (zone1 > 60) { score -= 40; issues.push('Zone 1 temp CRITICAL (>60°C)'); }
  else if (zone1 > 55) { score -= 20; issues.push('Zone 1 temp elevated'); }
  else if (zone1 < 35) { score -= 10; issues.push('Zone 1 temp below normal'); }

  if (zone2 > 60) { score -= 40; issues.push('Zone 2 temp CRITICAL (>60°C)'); }
  else if (zone2 > 50) { score -= 15; issues.push('Zone 2 temp elevated'); }

  if (zone3 > 60) { score -= 40; issues.push('Zone 3 temp CRITICAL (>60°C)'); }
  else if (zone3 > 55) { score -= 15; issues.push('Zone 3 temp elevated'); }

  if (dieTemp && (dieTemp < 40 || dieTemp > 55)) { score -= 10; issues.push('Die head temp out of range'); }

  if (diePressure > 140) { score -= 40; issues.push('Die pressure CRITICAL (>140 bar)'); }
  else if (diePressure > 130) { score -= 20; issues.push('Die pressure high'); }
  else if (diePressure < 60) { score -= 20; issues.push('Die pressure low (<60 bar)'); }

  if (motorCurrent > 75) { score -= 30; issues.push('Motor current OVERLOAD (>75A)'); }
  else if (motorCurrent > 65) { score -= 10; issues.push('Motor current elevated'); }

  if (doughMoisture && (doughMoisture < 29 || doughMoisture > 31)) { score -= 10; issues.push('Dough moisture out of range'); }

  return { score: Math.max(0, score), status: getHealthStatus(score), issues };
}

export function calculateFlourFeederHealth(readings) {
  let score = 100;
  if (!readings) return { score: 0, status: 'unknown', issues: [] };
  const issues = [];

  const { feedRate, motorCurrent, hopperFill } = readings;

  if (motorCurrent > 7.0) { score -= 40; issues.push('Motor current OVERLOAD (>7A)'); }
  else if (motorCurrent > 6.5) { score -= 15; issues.push('Motor current high'); }
  else if (motorCurrent < 3.5) { score -= 10; issues.push('Motor current low'); }

  if (feedRate < 300 || feedRate > 600) { score -= 15; issues.push('Feed rate out of normal range'); }
  if (hopperFill && hopperFill < 15) { score -= 20; issues.push('Hopper fill level critically low'); }
  else if (hopperFill && hopperFill < 30) { score -= 5; issues.push('Hopper fill level low'); }

  return { score: Math.max(0, score), status: getHealthStatus(score), issues };
}

export function calculatePanelHealth(readings) {
  let score = 100;
  if (!readings) return { score: 0, status: 'unknown', issues: [] };
  const issues = [];

  const { voltage, phase1, phase2, phase3, panelTemp, plcStatus } = readings;

  if (voltage && (voltage < 361 || voltage > 420)) { score -= 30; issues.push('Supply voltage out of tolerance'); }
  if (panelTemp > 50) { score -= 35; issues.push('Panel temp CRITICAL (>50°C)'); }
  else if (panelTemp > 45) { score -= 15; issues.push('Panel temp elevated'); }
  if (plcStatus === 'Fault') { score -= 40; issues.push('PLC FAULT active'); }
  else if (plcStatus === 'Warning') { score -= 20; issues.push('PLC warning active'); }

  const currents = [phase1, phase2, phase3].filter(Boolean);
  if (currents.length === 3) {
    const avg = currents.reduce((a, b) => a + b, 0) / 3;
    const maxDev = Math.max(...currents.map(c => Math.abs(c - avg)));
    if (maxDev / avg > 0.1) { score -= 20; issues.push('Phase imbalance detected'); }
  }

  return { score: Math.max(0, score), status: getHealthStatus(score), issues };
}

export function calculateSensorHealth(readings) {
  let score = 100;
  if (!readings) return { score: 0, status: 'unknown', issues: [] };
  const issues = [];

  const { outOfCalibration, unusualReadings } = readings;
  if (outOfCalibration && outOfCalibration.length > 0) {
    score -= outOfCalibration.length * 15;
    issues.push(`${outOfCalibration.length} sensor(s) out of calibration`);
  }
  if (unusualReadings && unusualReadings.trim()) {
    score -= 20;
    issues.push('Unusual sensor readings reported');
  }

  return { score: Math.max(0, score), status: getHealthStatus(score), issues };
}

export function calculatePreDryerHealth(readings) {
  let score = 100;
  if (!readings) return { score: 0, status: 'unknown', issues: [] };
  const issues = [];

  const { inletTemp, humidity, productCondition } = readings;

  if (inletTemp < 60 || inletTemp > 75) { score -= 20; issues.push('Pre-dryer inlet temp out of range'); }
  if (humidity < 75 || humidity > 85) { score -= 20; issues.push('Pre-dryer humidity out of range'); }
  if (productCondition === 'Sticking') { score -= 25; issues.push('Product sticking on belt'); }
  else if (productCondition === 'Cracking') { score -= 20; issues.push('Product cracking on belt'); }

  return { score: Math.max(0, score), status: getHealthStatus(score), issues };
}

export function calculateDryerHealth(readings) {
  let score = 100;
  if (!readings) return { score: 0, status: 'unknown', issues: [] };
  const issues = [];

  const { z1temp, z1rh, z2temp, z2rh, z3temp, z3rh, z4temp, z4rh, finalMoisture } = readings;

  // Zone 1 checks
  if (z1temp < 70 || z1temp > 80) { score -= 15; issues.push('Zone 1 temp out of range'); }
  if (z1rh < 75 || z1rh > 80) { score -= 10; issues.push('Zone 1 humidity out of range'); }

  // Zone 2 checks
  if (z2temp < 80 || z2temp > 90) { score -= 15; issues.push('Zone 2 temp out of range'); }
  if (z2rh < 65 || z2rh > 72) { score -= 10; issues.push('Zone 2 humidity out of range'); }

  // Final moisture
  if (finalMoisture > 13.5) { score -= 30; issues.push('Final moisture CRITICAL (>13.5%)'); }
  else if (finalMoisture > 13.0) { score -= 15; issues.push('Final moisture elevated'); }
  else if (finalMoisture < 11.5) { score -= 20; issues.push('Final moisture too low (<11.5%)'); }

  return { score: Math.max(0, score), status: getHealthStatus(score), issues };
}

function getHealthStatus(score) {
  if (score > 80) return 'normal';
  if (score >= 50) return 'warning';
  return 'critical';
}

// ── Calculate health for all machines from stored readings ────
export function calculateAllMachineHealth(latestReadings) {
  return {
    extruder: calculateExtruderHealth(latestReadings?.extruder),
    flourFeeder: calculateFlourFeederHealth(latestReadings?.flourFeeder),
    electronicsPanel: calculatePanelHealth(latestReadings?.electronicsPanel),
    sensors: calculateSensorHealth(latestReadings?.sensors),
    preDryer: calculatePreDryerHealth(latestReadings?.preDryer),
    dryer: calculateDryerHealth(latestReadings?.dryer),
  };
}

// ── Status helpers ────────────────────────────────────────────
export function getStatusColor(status) {
  if (status === 'normal') return 'text-emerald-400';
  if (status === 'warning') return 'text-amber-400';
  if (status === 'critical') return 'text-red-400';
  return 'text-slate-400';
}

export function getStatusBorderClass(status) {
  if (status === 'normal') return 'status-normal';
  if (status === 'warning') return 'status-warning';
  if (status === 'critical') return 'status-critical';
  return 'border-l-4 border-slate-600';
}

export function getStatusBadgeClass(status) {
  if (status === 'normal') return 'badge-normal';
  if (status === 'warning') return 'badge-warning';
  if (status === 'critical') return 'badge-critical';
  return 'badge-info';
}

export function getStatusLabel(status) {
  if (status === 'normal') return '🟢 NORMAL';
  if (status === 'warning') return '🟡 WARNING';
  if (status === 'critical') return '🔴 CRITICAL';
  return '⚪ UNKNOWN';
}

// ── Shift Detection ───────────────────────────────────────────
export function getCurrentShift(shiftTimes) {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;

  const parseTime = (t) => {
    const [h, m] = (t || '00:00').split(':').map(Number);
    return h * 60 + m;
  };

  const morningStart = parseTime(shiftTimes?.morning || '06:00');
  const eveningStart = parseTime(shiftTimes?.evening || '14:00');
  const nightStart = parseTime(shiftTimes?.night || '22:00');

  if (currentMinutes >= morningStart && currentMinutes < eveningStart) return 'Morning';
  if (currentMinutes >= eveningStart && currentMinutes < nightStart) return 'Evening';
  return 'Night';
}

export function getShiftColor(shift) {
  if (shift === 'Morning') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (shift === 'Evening') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
}

// ── Inventory Threshold Checks ────────────────────────────────
export function getInventoryStatus(item, current, thresholds) {
  const t = thresholds?.[item];
  if (!t) return 'normal';
  if (current <= t.critical) return 'critical';
  if (current <= t.warning) return 'warning';
  return 'normal';
}
