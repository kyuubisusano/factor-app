/**
 * Factor Net Edge Calculation Engine
 * Matches PRD specification:
 * edge = (Psell - Pbuy)/Pbuy - (fbuy + fsell) - (gbuy + gsell + b)/Q - s(Q) - h - c*t
 */

export interface EdgeCalculationInputs {
  priceBuy: number;
  priceSell: number;
  feeBuyBps: number;
  feeSellBps: number;
  gasBuyUsd: number;
  gasSellUsd: number;
  rebalanceUsd: number;
  sizeUsd: number;
  impactBps?: number;
  hedgeBps?: number;
  annualCapitalCost?: number; // default 0.10 (10%)
  idleDays?: number; // default 2
}

export interface EdgeResult {
  grossSpreadBps: number;
  venueFeesBps: number;
  gasBps: number;
  rebalanceBps: number;
  capitalCarryBps: number;
  netEdgeBps: number;
  clears: boolean;
  breakevenRebalanceUsd: number;
  netDollarProfit: number;
  annualizedApyPercent: number;
}

export const THRESHOLD_THETA_BPS = 15;

export function calculateEdge(i: EdgeCalculationInputs): EdgeResult {
  const size = i.sizeUsd > 0 ? i.sizeUsd : 1000;
  const annualCost = i.annualCapitalCost ?? 0.10;
  const idleDays = i.idleDays ?? 2;

  // 1. Gross Spread
  const grossFraction = (i.priceSell - i.priceBuy) / i.priceBuy;
  const grossSpreadBps = grossFraction * 10_000;

  // 2. Explicit Venue Fees
  const venueFeesBps = i.feeBuyBps + i.feeSellBps;

  // 3. Network Gas Cost
  const gasFraction = (i.gasBuyUsd + i.gasSellUsd) / size;
  const gasBps = gasFraction * 10_000;

  // 4. Rebalance Cost
  const rebalanceFraction = i.rebalanceUsd / size;
  const rebalanceBps = rebalanceFraction * 10_000;

  // 5. Capital Carry Cost (c * t / 365)
  const capitalCarryFraction = (annualCost / 365) * idleDays;
  const capitalCarryBps = capitalCarryFraction * 10_000;

  // 6. Net Edge (bps)
  const netEdgeBps = grossSpreadBps - venueFeesBps - gasBps - rebalanceBps - capitalCarryBps;

  // 7. Clears Threshold
  const clears = netEdgeBps >= THRESHOLD_THETA_BPS;

  // 8. Break-even Rebalance ($ per trade before net drops below theta)
  const breakevenRebalanceUsd = ((netEdgeBps - THRESHOLD_THETA_BPS) / 10_000) * size;

  // 9. Projected Dollar Net Profit per execution cycle
  const netDollarProfit = (netEdgeBps / 10_000) * size;

  // 10. Estimated Annualized Return (based on 365 / idleDays cycle frequency)
  const annualizedApyPercent = (netEdgeBps / 10_000) * (365 / idleDays) * 100;

  return {
    grossSpreadBps,
    venueFeesBps,
    gasBps,
    rebalanceBps,
    capitalCarryBps,
    netEdgeBps,
    clears,
    breakevenRebalanceUsd,
    netDollarProfit,
    annualizedApyPercent,
  };
}

export function formatBps(bps: number, showSign = true): string {
  const prefix = showSign && bps > 0 ? "+" : "";
  return `${prefix}${bps.toFixed(1)} bps`;
}

export function formatCurrency(amount: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}
