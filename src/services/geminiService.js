// ============================================================
// GEMINI 2.5 FLASH API SERVICE
// All AI calls routed through this module
// ============================================================

import { PASTA_NOVA_AGENT_PERSONA, PASTA_NOVA_KNOWLEDGE_BASE } from '../data/knowledgeBase.js';

const MODEL = 'gemini-2.5-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ── Build the API request ────────────────────────────────────
function buildRequest(userMessage, conversationHistory = [], department = 'Production', userProfile = {}, signal) {
  const profileText = buildProfileText(userProfile);

  const systemContent = [
    `SYSTEM INSTRUCTIONS:\n${PASTA_NOVA_AGENT_PERSONA}`,
    `KNOWLEDGE BASE:\n${PASTA_NOVA_KNOWLEDGE_BASE}`,
    `ACTIVE DEPARTMENT: ${department}`,
    profileText ? `USER OPERATIONAL PROFILE (use this to personalize every response):\n${profileText}` : '',
  ].filter(Boolean).join('\n\n');

  // Build turns: system primer + model ACK + history + current message
  const messages = [
    {
      role: 'user',
      parts: [{ text: systemContent }],
    },
    {
      role: 'model',
      parts: [{ text: `Understood. I am PASTA NOVA AGENT. I have studied the full Pasta Nova knowledge base and user profile. I am ready to assist the ${department} department with full persistent memory of all previous conversations.` }],
    },
    // Inject last 50 turns of persistent history
    ...conversationHistory.slice(-50).map(m => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
    // Current message
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  return {
    contents: messages,
    generationConfig: {
      maxOutputTokens: 1500,
      temperature: 0.3,
      topP: 0.85,
      topK: 40,
    },
  };
}

function buildProfileText(profile) {
  if (!profile || Object.keys(profile).length === 0) return '';
  const lines = [];
  if (profile.extruderCapacity) lines.push(`Extruder capacity: ${profile.extruderCapacity}`);
  if (profile.shiftsPerDay) lines.push(`Shifts per day: ${profile.shiftsPerDay}`);
  if (profile.currentShape) lines.push(`Currently producing: ${profile.currentShape}`);
  if (profile.certifications?.length) lines.push(`Certifications held: ${profile.certifications.join(', ')}`);
  if (profile.commonIssues?.length) lines.push(`Common issues: ${profile.commonIssues.join(', ')}`);
  if (profile.avgDailyConsumption) lines.push(`Avg daily semolina consumption: ${profile.avgDailyConsumption} kg`);
  if (profile.primaryMarket) lines.push(`Primary market: ${profile.primaryMarket}`);
  if (profile.notes?.length) lines.push(`Operator notes: ${profile.notes.join('; ')}`);
  return lines.join('\n');
}

async function callAPI(apiKey, requestBody, signal) {
  if (!apiKey) throw new Error('NO_API_KEY');
  const response = await fetch(`${BASE_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error('RATE_LIMIT');
    if (status === 400) throw new Error('REQUEST_TOO_LONG');
    if (status === 403) throw new Error('INVALID_KEY');
    throw new Error(`API_ERROR_${status}`);
  }

  const data = await response.json();

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('NO_RESPONSE');
  }

  return data.candidates[0].content.parts[0].text;
}

function getErrorMessage(error) {
  if (error.name === 'AbortError') return null; // cancelled
  if (error.message === 'NO_API_KEY') return '⚠️ Please configure your Gemini API key in Settings.';
  if (error.message === 'RATE_LIMIT') return '⏳ Too many requests. Please wait 30 seconds and try again.';
  if (error.message === 'REQUEST_TOO_LONG') return '📋 Request was too long. Please clear some chat history.';
  if (error.message === 'INVALID_KEY') return '🔑 Invalid API key. Please check your Gemini API key in Settings.';
  if (error.message === 'NO_RESPONSE') return '⚠️ No response from AI. Please try again.';
  if (error.message?.includes('Failed to fetch')) return '🌐 Connection failed. Check your internet connection.';
  return `⚠️ Error: ${error.message}`;
}

// ── Main Chat Function ────────────────────────────────────────
export async function callPastanovaAgent({ apiKey, userMessage, conversationHistory, department, userProfile, signal }) {
  try {
    const body = buildRequest(userMessage, conversationHistory, department, userProfile, signal);
    return { text: await callAPI(apiKey, body, signal), error: null };
  } catch (err) {
    const msg = getErrorMessage(err);
    return { text: null, error: msg };
  }
}

// ── Template A — Machine Readings Analysis ────────────────────
export async function analyzeMachineReadings({ apiKey, machine, readings, productLine, shape, shift, conversationHistory, userProfile, signal }) {
  const prompt = `The following machine readings have been submitted by the operator at Pasta Nova.
Analyze each value against the optimal ranges from the knowledge base. Identify any anomalies. 
Explain the most probable root causes. Provide prioritized corrective actions using the structured format below.

Current product line: ${productLine || 'Unknown'}
Current shape being produced: ${shape || 'Unknown'}
Current shift: ${shift || 'Unknown'}
Machine: ${machine}

Submitted readings:
${JSON.stringify(readings, null, 2)}

Response format required:
► STATUS: ${machine} — [NORMAL / WARNING / CRITICAL]
► OBSERVATION: What the readings indicate
► ROOT CAUSE: Most probable explanation for any anomaly
► IMMEDIATE ACTION: What to do right now (step by step)
► PREVENTIVE MEASURE: Long-term corrective action
► PRODUCTION IMPACT: Consequence if issue is not resolved
► CONFIDENCE LEVEL: [HIGH / MEDIUM / LOW] with brief justification`;

  return callPastanovaAgent({ apiKey, userMessage: prompt, conversationHistory: conversationHistory || [], department: 'Production', userProfile, signal });
}

// ── Template B — Quality Defect Diagnosis ────────────────────
export async function analyzeQualityDefect({ apiKey, defect, productLine, shape, stage, recentChanges, conversationHistory, userProfile, signal }) {
  const prompt = `A quality defect has been reported at Pasta Nova.
Defect described: ${defect}
Product line: ${productLine} | Shape: ${shape}
When detected: ${stage} (extrusion / pre-dryer / dryer / packaging / QC)
Any recent changes to machine settings: ${recentChanges || 'None reported'}

Using the knowledge base, identify the most probable root cause of this defect, the upstream machine or process step responsible, the immediate corrective action to stop the defect now, and the preventive measure to avoid it in future batches. Provide a confidence level for your diagnosis.`;

  return callPastanovaAgent({ apiKey, userMessage: prompt, conversationHistory: conversationHistory || [], department: 'Quality Control', userProfile, signal });
}

// ── Template C — Inventory Prediction ────────────────────────
export async function predictInventory({ apiKey, inventory, productionPlan, leadTimeDays, conversationHistory, userProfile, signal }) {
  const prompt = `Inventory status at Pasta Nova as of today:
${JSON.stringify(inventory, null, 2)}

Production plan for next 7 days:
${productionPlan}

Using the knowledge base consumption rates, calculate:
1. Expected consumption per item over the next 7 days
2. Stock remaining after 7 days per item
3. Which items will reach critical low-stock threshold
4. Recommended reorder date per item (assuming ${leadTimeDays || 3} days lead time)
5. Recommended order quantity to ensure 14-day buffer after delivery

Provide a confidence level for your estimates.`;

  return callPastanovaAgent({ apiKey, userMessage: prompt, conversationHistory: conversationHistory || [], department: 'Inventory', userProfile, signal });
}

// ── Template D — Export Market Entry Brief ────────────────────
export async function generateExportBrief({ apiKey, country, product, capacityKg, pricePerKg, certifications, conversationHistory, userProfile, signal }) {
  const prompt = `Generate a full export market entry brief for Pasta Nova.
Target market: ${country}
Product to export: ${product}
Current monthly production capacity: ${capacityKg} kg
Current factory gate price: ${pricePerKg} per kg
Certifications currently held: ${certifications || 'None specified'}

Provide:
1. Market demand assessment for this product in the target market
2. Specific regulatory and certification requirements
3. Recommended export pricing range (FOB)
4. Key competitors in that market
5. Packaging and labeling recommendations (language, format, size)
6. Realistic timeline to first shipment with milestones
7. Top 3 risks and specific mitigation strategies
8. Overall opportunity rating: LOW / MEDIUM / HIGH with justification
9. Your confidence level in this assessment`;

  return callPastanovaAgent({ apiKey, userMessage: prompt, conversationHistory: conversationHistory || [], department: 'Export', userProfile, signal });
}

// ── Shift Summary ─────────────────────────────────────────────
export async function generateShiftSummary({ apiKey, summaryText, conversationHistory, userProfile, signal }) {
  const prompt = `The operator has submitted the following end-of-shift notes at Pasta Nova:

"${summaryText}"

Please format this as a structured shift summary card including:
► SHIFT OVERVIEW
► PRODUCTION PERFORMANCE
► MACHINE STATUS HIGHLIGHTS
► QUALITY OBSERVATIONS
► ACTION ITEMS FOR NEXT SHIFT
► OVERALL SHIFT RATING: EXCELLENT / GOOD / FAIR / POOR`;

  return callPastanovaAgent({ apiKey, userMessage: prompt, conversationHistory: conversationHistory || [], department: 'Production', userProfile, signal });
}
