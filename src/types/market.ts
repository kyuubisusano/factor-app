export type VenueId = "kraken" | "gate" | "bybit" | "jupiter";

export interface TokenizedEquity {
  underlying: string;
  symbol: string;
  name: string;
  category: "Mega Tech" | "Semiconductors" | "Index ETFs" | "Fintech & Crypto" | "Value & Growth";
  solanaMint: string;
  decimals: number;
  multiplierBps: number;
  jupiterLiquidityUsd: number;
  krakenPair: string;
  gatePair: string | null;
  bybitSymbol: string | null;
}

export interface VenueQuote {
  venue: VenueId;
  side: "buy" | "sell";
  price: number;
  rawPrice: number;
  feeBps: number;
  gasUsd: number;
  bookSpreadBps: number | null;
  timestamp: number;
}

export interface GateChecklist {
  netEdge: boolean;
  referenceInBand: boolean;
  marketOpen: boolean;
  rebalanceKnown: boolean;
  noHold: boolean;
  circuitArmed: boolean;
}

export interface ArbitrageOpportunity {
  id: string;
  underlying: string;
  symbol: string;
  name: string;
  category: string;
  buyVenue: VenueId;
  sellVenue: VenueId;
  buyPrice: number;
  sellPrice: number;
  sizeUsd: number;
  grossSpreadBps: number;
  feesBps: number;
  gasBps: number;
  carryBps: number;
  netEdgeBps: number;
  clears: boolean;
  tradable: boolean;
  breakevenRebalanceUsd: number;
  refPrice: number;
  refDeviationBps: number;
  refSourcesCount: number;
  marketMode: "OPEN" | "CLOSED";
  gates: GateChecklist;
  holdReason: string | null;
  buyBookSpreadBps: number | null;
  sellBookSpreadBps: number | null;
  solanaMint: string;
  decimals: number;
  sparkline: number[];
  lastUpdated: number;
}

export interface CircuitBreakerState {
  tripped: boolean;
  reason: string | null;
  lastTrippedAt: number | null;
  events: Array<{
    id: string;
    ts: number;
    kind: string;
    detail: string;
  }>;
}

export interface ProtocolMetrics {
  totalMonitoredLiquidityUsd: number;
  activePairsCount: number;
  clearingOpportunitiesCount: number;
  sofrBenchmarkRate: number;
  solanaSlot: number;
  solanaSlotAgeSec: number;
  marketSession: "OPEN" | "CLOSED";
  nextSessionTimeRemaining: string;
}
