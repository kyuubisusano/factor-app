import { TOKENIZED_EQUITIES } from "../data/registry";
import { calculateEdge } from "./edge";
import type { ArbitrageOpportunity, CircuitBreakerState, ProtocolMetrics, VenueId } from "../types/market";

// Real-world baseline reference prices (USD)
const BASELINE_PRICES: Record<string, number> = {
  NVDA: 217.49,
  AAPL: 341.80,
  TSLA: 361.97,
  SPY: 771.42,
  QQQ: 727.37,
  COIN: 182.97,
  MSTR: 151.28,
  GOOGL: 348.90,
  META: 733.62,
  MSFT: 538.30,
  AMZN: 254.63,
  AVGO: 344.01,
  HOOD: 103.78,
  CRCL: 86.61,
  GLD: 382.19,
  PLTR: 200.17,
  KO: 91.91,
  MCD: 242.34,
  STRC: 99.53,
  SPCX: 148.90,
  "BRK.B": 525.79,
  GME: 28.02,
};

// Fee schedules (bps)
const VENUE_FEES: Record<VenueId, number> = {
  kraken: 8,
  bybit: 20,
  gate: 20,
  jupiter: 0, // embedded in quote
};

export function generateOpportunities(
  sessionOverride?: "OPEN" | "CLOSED",
  rebalanceKnownOverride = false,
  circuitTrippedOverride = false
): ArbitrageOpportunity[] {
  const isMarketOpen = sessionOverride === "OPEN";
  const now = Date.now();

  const opportunities: ArbitrageOpportunity[] = [];

  for (const eq of TOKENIZED_EQUITIES) {
    const baseRef = BASELINE_PRICES[eq.underlying] ?? 100;

    // Available venues for this asset
    const venues: VenueId[] = ["jupiter", "kraken"];
    if (eq.gatePair) venues.push("gate");
    if (eq.bybitSymbol) venues.push("bybit");

    // Generate venue bids & asks with realistic micro-spreads
    const venueQuotes: Record<VenueId, { buy: number; sell: number; bookSpreadBps: number }> = {} as any;

    venues.forEach((v) => {
      // Deterministic slight drift per venue
      let driftBps = 0;
      let spreadBps = 1.5;

      if (v === "jupiter") {
        driftBps = ((eq.underlying.charCodeAt(0) * 7) % 25) - 10;
        spreadBps = 12;
      } else if (v === "kraken") {
        driftBps = ((eq.underlying.charCodeAt(1) * 3) % 15) - 6;
        spreadBps = 2.5;
      } else if (v === "gate") {
        driftBps = ((eq.underlying.charCodeAt(0) * 5) % 45) - 18;
        spreadBps = 28;
      } else if (v === "bybit") {
        driftBps = ((eq.underlying.charCodeAt(0) * 4) % 20) - 8;
        spreadBps = 8;
      }

      // High-volatility or special cases (e.g. AAPL, TSLA, STRC having temporary dislocation)
      if (eq.underlying === "AAPL" && v === "jupiter") {
        driftBps = -22;
      }
      if (eq.underlying === "AAPL" && v === "kraken") {
        driftBps = 18;
      }
      if (eq.underlying === "TSLA" && v === "kraken") {
        driftBps = -20;
      }
      if (eq.underlying === "TSLA" && v === "jupiter") {
        driftBps = 16;
      }
      if (eq.underlying === "KO" && v === "gate") {
        driftBps = -45; // Gate ask is lower -> opportunity to buy Gate sell Jupiter
      }
      if (eq.underlying === "STRC" && v === "kraken") {
        driftBps = -35;
      }
      if (eq.underlying === "NVDA" && v === "kraken") {
        driftBps = -12;
      }

      const mid = baseRef * (1 + driftBps / 10_000);
      const halfSpread = (spreadBps / 2 / 10_000) * mid;

      venueQuotes[v] = {
        buy: mid + halfSpread, // ask
        sell: mid - halfSpread, // bid
        bookSpreadBps: spreadBps,
      };
    });

    // Pairwise evaluation
    for (const buyVenue of venues) {
      for (const sellVenue of venues) {
        if (buyVenue === sellVenue) continue;
        // Focus on CEX <-> DEX plays
        const isCexDex = (buyVenue === "jupiter" && sellVenue !== "jupiter") ||
                         (buyVenue !== "jupiter" && sellVenue === "jupiter");
        if (!isCexDex) continue;

        const buyPrice = venueQuotes[buyVenue].buy;
        const sellPrice = venueQuotes[sellVenue].sell;

        const feeBuyBps = VENUE_FEES[buyVenue];
        const feeSellBps = VENUE_FEES[sellVenue];
        const gasBuyUsd = buyVenue === "jupiter" ? 0.02 : 0;
        const gasSellUsd = sellVenue === "jupiter" ? 0.02 : 0;

        const edge = calculateEdge({
          priceBuy: buyPrice,
          priceSell: sellPrice,
          feeBuyBps,
          feeSellBps,
          gasBuyUsd,
          gasSellUsd,
          rebalanceUsd: 0,
          sizeUsd: 1000,
          annualCapitalCost: 0.10,
          idleDays: 2,
        });

        const pairMid = (buyPrice + sellPrice) / 2;
        const refDeviationBps = ((pairMid - baseRef) / baseRef) * 10_000;
        const referenceInBand = Math.abs(refDeviationBps) <= 300; // <= 3%

        const gates = {
          netEdge: edge.clears,
          referenceInBand,
          marketOpen: isMarketOpen,
          rebalanceKnown: rebalanceKnownOverride,
          noHold: eq.underlying !== "GME", // simulated corporate action window for GME
          circuitArmed: !circuitTrippedOverride,
        };

        const tradable =
          gates.netEdge &&
          gates.referenceInBand &&
          gates.marketOpen &&
          gates.rebalanceKnown &&
          gates.noHold &&
          gates.circuitArmed;

        opportunities.push({
          id: `${eq.underlying}:${buyVenue}-${sellVenue}`,
          underlying: eq.underlying,
          symbol: eq.symbol,
          name: eq.name,
          category: eq.category,
          buyVenue,
          sellVenue,
          buyPrice,
          sellPrice,
          sizeUsd: 1000,
          grossSpreadBps: edge.grossSpreadBps,
          feesBps: edge.venueFeesBps,
          gasBps: edge.gasBps,
          carryBps: edge.capitalCarryBps,
          netEdgeBps: edge.netEdgeBps,
          clears: edge.clears,
          tradable,
          breakevenRebalanceUsd: edge.breakevenRebalanceUsd,
          refPrice: baseRef,
          refDeviationBps,
          refSourcesCount: 3,
          marketMode: isMarketOpen ? "OPEN" : "CLOSED",
          gates,
          holdReason: eq.underlying === "GME" ? "Corporate Action Window" : null,
          buyBookSpreadBps: venueQuotes[buyVenue].bookSpreadBps,
          sellBookSpreadBps: venueQuotes[sellVenue].bookSpreadBps,
          solanaMint: eq.solanaMint,
          decimals: eq.decimals,
          sparkline: [
            Math.max(2, edge.grossSpreadBps * 0.78 + (((eq.underlying.charCodeAt(0) * 3) % 11) - 5)),
            Math.max(2, edge.grossSpreadBps * 0.85 + (((eq.underlying.charCodeAt(1) * 2) % 9) - 4)),
            Math.max(2, edge.grossSpreadBps * 0.92 + (((eq.underlying.charCodeAt(0) * 5) % 13) - 6)),
            Math.max(2, edge.grossSpreadBps * 0.89 + (((eq.underlying.charCodeAt(1) * 7) % 7) - 3)),
            Math.max(2, edge.grossSpreadBps * 1.05 + (((eq.underlying.charCodeAt(0) * 4) % 15) - 7)),
            Math.max(2, edge.grossSpreadBps * 0.97 + (((eq.underlying.charCodeAt(1) * 3) % 11) - 5)),
            Math.max(2, edge.grossSpreadBps * 1.02 + (((eq.underlying.charCodeAt(0) * 2) % 8) - 4)),
            edge.grossSpreadBps,
          ],
          lastUpdated: now,
        });
      }
    }
  }

  // Sort descending by net edge
  return opportunities.sort((a, b) => b.netEdgeBps - a.netEdgeBps);
}

export const INITIAL_CIRCUIT_STATE: CircuitBreakerState = {
  tripped: false,
  reason: null,
  lastTrippedAt: null,
  events: [
    {
      id: "evt-01",
      ts: Date.now() - 3600000 * 4,
      kind: "SYSTEM_INITIALIZE",
      detail: "Hardware security modules armed. All 22 tokenized equities verified on-chain.",
    },
    {
      id: "evt-02",
      ts: Date.now() - 3600000 * 2,
      kind: "REFERENCE_AUDIT",
      detail: "3-source median check (Nasdaq + Hyperliquid + Issuer) passed with max divergence 4.2 bps.",
    },
  ],
};

export const INITIAL_PROTOCOL_METRICS: ProtocolMetrics = {
  totalMonitoredLiquidityUsd: 22840000,
  activePairsCount: 100,
  clearingOpportunitiesCount: 4,
  sofrBenchmarkRate: 0.0388,
  solanaSlot: 341892041,
  solanaSlotAgeSec: 0.8,
  marketSession: "CLOSED",
  nextSessionTimeRemaining: "06h 44m",
};
