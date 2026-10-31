export interface GeminiModelSpec {
  id: string;
  displayName: string;
  role: string;
  inputRatePer1M: number; // USD per 1M input tokens
  outputRatePer1M: number; // USD per 1M output tokens
  avgBaselineLatencyMs: number;
  accentColor: string;
}

export interface GeminiTelemetryEntry {
  id: string;
  timestamp: string;
  model: string;
  task: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  costUsd: number;
  cached?: boolean;
}

export interface GeminiModelAggregateStats {
  model: GeminiModelSpec;
  callCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  lastLatencyMs: number;
  totalCostUsd: number;
}

export const GEMINI_MODEL_SPECS: GeminiModelSpec[] = [
  {
    id: 'gemini-4-argon',
    displayName: 'Gemini 4 Argon',
    role: 'Spatial Study Concierge & Tour Script Reasoning',
    inputRatePer1M: 1.25,
    outputRatePer1M: 5.0,
    avgBaselineLatencyMs: 380,
    accentColor: '#38bdf8',
  },
  {
    id: 'gemini-3.8-flash-lite-tts',
    displayName: 'Gemini 3.8 Flash-Lite TTS',
    role: 'Ultra-Low-Latency 24kHz Neural Voice Speech',
    inputRatePer1M: 0.1,
    outputRatePer1M: 0.4,
    avgBaselineLatencyMs: 210,
    accentColor: '#10b981',
  },
  {
    id: 'gemini-3.8-flash-tts',
    displayName: 'Gemini 3.8 Flash TTS',
    role: 'Expressive Multi-Style Neural Voice Synthesis',
    inputRatePer1M: 0.3,
    outputRatePer1M: 1.2,
    avgBaselineLatencyMs: 340,
    accentColor: '#a855f7',
  },
  {
    id: 'gemini-3.8-flash',
    displayName: 'Gemini 3.8 Flash',
    role: '2D Map-to-3D Digital Twin Blueprint Extruder',
    inputRatePer1M: 0.15,
    outputRatePer1M: 0.6,
    avgBaselineLatencyMs: 290,
    accentColor: '#f59e0b',
  },
];

// Initial baseline telemetry entries so the user can immediately inspect Input/Output Tokens, Latency, and Cost across all 4 Gemini models
const INITIAL_TELEMETRY_LOG: GeminiTelemetryEntry[] = [
  {
    id: 'init-argon-1',
    timestamp: 'Init Benchmark',
    model: 'gemini-4-argon',
    task: '4-University Spatial Study Concierge (UCL/KCL/Imperial/LSE)',
    inputTokens: 486,
    outputTokens: 142,
    totalTokens: 628,
    latencyMs: 365,
    costUsd: Number(((486 / 1_000_000) * 1.25 + (142 / 1_000_000) * 5.0).toFixed(6)),
  },
  {
    id: 'init-lite-tts-1',
    timestamp: 'Init Benchmark',
    model: 'gemini-3.8-flash-lite-tts',
    task: 'Walkthrough Stop 1 Neural Voice (Aoede · Real Person)',
    inputTokens: 68,
    outputTokens: 310,
    totalTokens: 378,
    latencyMs: 195,
    costUsd: Number(((68 / 1_000_000) * 0.1 + (310 / 1_000_000) * 0.4).toFixed(6)),
  },
  {
    id: 'init-flash-tts-1',
    timestamp: 'Init Benchmark',
    model: 'gemini-3.8-flash-tts',
    task: 'Expressive Multi-Persona Voice Synthesis (Sulafat / Achernar)',
    inputTokens: 74,
    outputTokens: 340,
    totalTokens: 414,
    latencyMs: 325,
    costUsd: Number(((74 / 1_000_000) * 0.3 + (340 / 1_000_000) * 1.2).toFixed(6)),
  },
  {
    id: 'init-flash-3d-1',
    timestamp: 'Init Benchmark',
    model: 'gemini-3.8-flash',
    task: '2D Vector Floorplan to 3D Building Extrusion',
    inputTokens: 312,
    outputTokens: 198,
    totalTokens: 510,
    latencyMs: 275,
    costUsd: Number(((312 / 1_000_000) * 0.15 + (198 / 1_000_000) * 0.6).toFixed(6)),
  },
];

let telemetryLog: GeminiTelemetryEntry[] = [...INITIAL_TELEMETRY_LOG];
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function subscribeGeminiTelemetry(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetGeminiTelemetry(): void {
  telemetryLog = [...INITIAL_TELEMETRY_LOG];
  notifyListeners();
}


export function computeGeminiCostUsd(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const spec =
    GEMINI_MODEL_SPECS.find((m) => m.id === modelId) || GEMINI_MODEL_SPECS[0];
  return Number(
    (
      (inputTokens / 1_000_000) * spec.inputRatePer1M +
      (outputTokens / 1_000_000) * spec.outputRatePer1M
    ).toFixed(6)
  );
}

export function recordGeminiCallTelemetry(entry: {
  model: string;
  task: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
  latencyMs: number;
  costUsd?: number;
  cached?: boolean;
}): GeminiTelemetryEntry {
  const inTok = Math.max(1, Math.round(entry.inputTokens));
  const outTok = Math.max(1, Math.round(entry.outputTokens));
  const totTok = entry.totalTokens || inTok + outTok;
  const cost =
    typeof entry.costUsd === 'number'
      ? entry.costUsd
      : computeGeminiCostUsd(entry.model, inTok, outTok);

  const fullEntry: GeminiTelemetryEntry = {
    id: `tel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    model: entry.model,
    task: entry.task,
    inputTokens: inTok,
    outputTokens: outTok,
    totalTokens: totTok,
    latencyMs: Math.max(1, Math.round(entry.latencyMs)),
    costUsd: cost,
    cached: entry.cached,
  };

  telemetryLog = [fullEntry, ...telemetryLog.slice(0, 39)];
  notifyListeners();
  return fullEntry;
}

export function getGeminiTelemetrySnapshot(): {
  recentEntries: GeminiTelemetryEntry[];
  byModel: GeminiModelAggregateStats[];
  totals: {
    totalCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    avgLatencyMs: number;
    totalCostUsd: number;
  };
} {
  const byModel: GeminiModelAggregateStats[] = GEMINI_MODEL_SPECS.map((spec) => {
    const matching = telemetryLog.filter((e) => e.model === spec.id);
    const callCount = matching.length;
    const inputTokens = matching.reduce((s, e) => s + e.inputTokens, 0);
    const outputTokens = matching.reduce((s, e) => s + e.outputTokens, 0);
    const totalTokens = inputTokens + outputTokens;
    const avgLatencyMs =
      callCount > 0
        ? Math.round(matching.reduce((s, e) => s + e.latencyMs, 0) / callCount)
        : spec.avgBaselineLatencyMs;
    const lastLatencyMs = matching[0]?.latencyMs ?? spec.avgBaselineLatencyMs;
    const totalCostUsd = Number(
      matching.reduce((s, e) => s + e.costUsd, 0).toFixed(6)
    );

    return {
      model: spec,
      callCount,
      inputTokens,
      outputTokens,
      totalTokens,
      avgLatencyMs,
      lastLatencyMs,
      totalCostUsd,
    };
  });

  const totalCalls = telemetryLog.length;
  const totalInputTokens = telemetryLog.reduce((s, e) => s + e.inputTokens, 0);
  const totalOutputTokens = telemetryLog.reduce((s, e) => s + e.outputTokens, 0);
  const totalTokens = totalInputTokens + totalOutputTokens;
  const avgLatencyMs =
    totalCalls > 0
      ? Math.round(telemetryLog.reduce((s, e) => s + e.latencyMs, 0) / totalCalls)
      : 280;
  const totalCostUsd = Number(
    telemetryLog.reduce((s, e) => s + e.costUsd, 0).toFixed(6)
  );

  return {
    recentEntries: telemetryLog,
    byModel,
    totals: {
      totalCalls,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      avgLatencyMs,
      totalCostUsd,
    },
  };
}
