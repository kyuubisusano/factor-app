import type { ArbitrageOpportunity } from "../types/market";

const API_BASE = "http://localhost:3001/api";

export interface ExecutionRecord {
  id: string;
  ts: number;
  symbol: string;
  operatorId: string;
  buyVenue: string;
  sellVenue: string;
  sizeUsd: number;
  buyPrice: number;
  sellPrice: number;
  grossBps: number;
  feesBps: number;
  netBps: number;
  dollarProfit: number;
  gatesJson: string;
  status: string;
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export interface BackendCircuitStatus {
  marketSession: string;
  circuitState: {
    tripped: boolean;
    reason: string | null;
    tsMs: number | null;
  };
  events: {
    tsMs: number;
    kind: string;
    detail: string;
  }[];
  rebalanceKnown: boolean;
}

export async function getBackendStatus(): Promise<BackendCircuitStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/status`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function toggleCircuitBackend(tripped?: boolean, reason?: string): Promise<{
  success: boolean;
  circuitState?: { tripped: boolean; reason: string | null; tsMs: number | null };
  events?: { tsMs: number; kind: string; detail: string }[];
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/circuit/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripped, reason }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.error || "Toggle failed" };
    }
    return await res.json();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export interface DailyGateSummary {
  day: string;
  play: string;
  scans: number;
  clearing: number;
  tradable: number;
  bestNetBps: number;
  bestBreakevenUsd: number;
}

export async function getDailyReportsBackend(): Promise<DailyGateSummary[]> {
  try {
    const res = await fetch(`${API_BASE}/reports/daily`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json();
    return data.daily || [];
  } catch {
    return [];
  }
}

export async function getLiveOpportunities(sizeUsd = 10000): Promise<ArbitrageOpportunity[] | null> {
  try {
    const res = await fetch(`${API_BASE}/opportunities?size=${sizeUsd}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.opportunities || null;
  } catch {
    return null;
  }
}

export async function simulateBackendExecution(payload: {
  symbol: string;
  sizeUsd: number;
  buyVenue: string;
  sellVenue: string;
  operatorId?: string;
}): Promise<{ success: boolean; ticket?: ExecutionRecord; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.error || "Simulation failed" };
    }
    const data = await res.json();
    return { success: true, ticket: data.ticket };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getExecutionHistory(limit = 20): Promise<ExecutionRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/executions?limit=${limit}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.executions || [];
  } catch {
    return [];
  }
}

export interface OperatorRecord {
  id: string;
  name: string;
  deskCode: string;
  firmName: string;
  email?: string;
  riskFloorBps: number;
  maxSizeUsd: number;
  createdAt: number;
}

export async function registerOperatorApi(payload: {
  name: string;
  deskCode: string;
  firmName: string;
  email?: string;
  riskFloorBps?: number;
}): Promise<{ success: boolean; operator?: OperatorRecord; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/operators/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Registration failed" };
    }
    return { success: true, operator: data.operator };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function loginOperatorApi(deskCode: string): Promise<{ success: boolean; operator?: OperatorRecord; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/operators/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deskCode }),
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Login failed" };
    }
    return { success: true, operator: data.operator };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function listOperatorsApi(): Promise<OperatorRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/operators`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json();
    return data.operators || [];
  } catch {
    return [];
  }
}
