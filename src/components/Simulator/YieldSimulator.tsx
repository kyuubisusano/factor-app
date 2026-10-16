import React, { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import s from "./YieldSimulator.module.css";
import { calculateEdge, formatBps, formatCurrency } from "../../engine/edge";
import { trackAnonymousEvent } from "../../services/telemetry";

interface YieldSimulatorProps {
  initialSpreadBps?: number;
  initialSizeUsd?: number;
  initialTicker?: string;
  onToast?: (toast: { type: "success" | "info" | "warning"; title: string; message?: string }) => void;
}

export const YieldSimulator: React.FC<YieldSimulatorProps> = ({
  initialSpreadBps,
  initialSizeUsd,
  initialTicker,
  onToast,
}) => {
  const [tradeSize, setTradeSize] = useState<number>(initialSizeUsd || 10000);
  const [grossSpreadBps, setGrossSpreadBps] = useState<number>(initialSpreadBps || 38.5);
  const [assetName, setAssetName] = useState<string>(initialTicker || "Custom Pair");
  const [feeTier, setFeeTier] = useState<"standard" | "institutional" | "vip">("standard");
  const [idleDays, setIdleDays] = useState<number>(2);
  const [annualCapitalCost, setAnnualCapitalCost] = useState<number>(0.10);
  const [copiedMemo, setCopiedMemo] = useState<boolean>(false);

  useEffect(() => {
    if (initialSpreadBps !== undefined) setGrossSpreadBps(initialSpreadBps);
    if (initialSizeUsd !== undefined) setTradeSize(initialSizeUsd);
    if (initialTicker !== undefined) setAssetName(initialTicker);
  }, [initialSpreadBps, initialSizeUsd, initialTicker]);

  const feePresetBps = {
    standard: 28,
    institutional: 14,
    vip: 4,
  }[feeTier];

  const edgeResult = calculateEdge({
    priceBuy: 100,
    priceSell: 100 * (1 + grossSpreadBps / 10_000),
    feeBuyBps: feePresetBps / 2,
    feeSellBps: feePresetBps / 2,
    gasBuyUsd: 0,
    gasSellUsd: 0.02,
    rebalanceUsd: 0,
    sizeUsd: tradeSize,
    annualCapitalCost,
    idleDays,
  });

  const cyclesPerMonth = Math.floor(30 / Math.max(idleDays, 1));
  const monthlyProjectedDollar = edgeResult.netDollarProfit * cyclesPerMonth;

  const handleCopyMemo = () => {
    const memo = `FACTOR YIELD SIMULATION: ${assetName}
Size: ${formatCurrency(tradeSize, 0)}
Gross Spread: ${grossSpreadBps.toFixed(1)} bps
Fees: ${feePresetBps} bps (${feeTier})
Hold: ${idleDays}d
Net Edge: ${formatBps(edgeResult.netEdgeBps)}
Profit/Trade: ${formatCurrency(edgeResult.netDollarProfit)}
Est. Monthly: ${formatCurrency(monthlyProjectedDollar)} (${cyclesPerMonth} cycles)
Annualized APY: ${edgeResult.annualizedApyPercent.toFixed(1)}%
Breakeven Rebalance: ${formatCurrency(edgeResult.breakevenRebalanceUsd)}`;

    navigator.clipboard.writeText(memo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
    trackAnonymousEvent("simulation_memo_copied");
    if (onToast) {
      onToast({
        type: "success",
        title: "Simulation Data Copied",
      });
    }
  };

  return (
    <div className={s.container}>
      {/* Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Yield Simulator</h1>
          <p className={s.subtitle}>
            Model net arbitrage returns across taker fees, gas, and capital carry costs.
          </p>
        </div>
        <button className={s.copyBtn} onClick={handleCopyMemo}>
          {copiedMemo ? <Check size={13} className={s.textGreen} /> : <Copy size={13} />}
          <span>{copiedMemo ? "Copied" : "Copy Summary"}</span>
        </button>
      </div>

      <div className={s.grid}>
        {/* Left Column: Parameter Inputs */}
        <div className={s.card}>
          <div className={s.cardHeader}>Parameters ({assetName})</div>

          {/* Trade Size Slider */}
          <div className={s.field}>
            <div className={s.fieldLabelRow}>
              <span>Notional Sizing (Q)</span>
              <span className={s.monoVal}>{formatCurrency(tradeSize, 0)}</span>
            </div>
            <input
              type="range"
              min={1000}
              max={100000}
              step={1000}
              value={tradeSize}
              onChange={(e) => setTradeSize(Number(e.target.value))}
              className={s.slider}
            />
            <div className={s.chipsRow}>
              {[1000, 5000, 10000, 25000, 50000, 100000].map((val) => (
                <button
                  key={val}
                  className={`${s.chip} ${tradeSize === val ? s.chipActive : ""}`}
                  onClick={() => setTradeSize(val)}
                >
                  ${val >= 1000 ? `${val / 1000}k` : val}
                </button>
              ))}
            </div>
          </div>

          {/* Gross Spread */}
          <div className={s.field}>
            <div className={s.fieldLabelRow}>
              <span>Gross Dislocation Spread</span>
              <span className={s.monoVal}>{grossSpreadBps.toFixed(1)} bps</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={0.5}
              value={grossSpreadBps}
              onChange={(e) => setGrossSpreadBps(Number(e.target.value))}
              className={s.slider}
            />
          </div>

          {/* Fee Tier */}
          <div className={s.field}>
            <div className={s.fieldLabelRow}>
              <span>Venue Fee Tier</span>
              <span className={s.monoVal}>{feePresetBps} bps</span>
            </div>
            <div className={s.tierButtons}>
              <button
                className={`${s.tierBtn} ${feeTier === "standard" ? s.tierBtnActive : ""}`}
                onClick={() => setFeeTier("standard")}
              >
                Standard (28 bps)
              </button>
              <button
                className={`${s.tierBtn} ${feeTier === "institutional" ? s.tierBtnActive : ""}`}
                onClick={() => setFeeTier("institutional")}
              >
                Institutional (14 bps)
              </button>
              <button
                className={`${s.tierBtn} ${feeTier === "vip" ? s.tierBtnActive : ""}`}
                onClick={() => setFeeTier("vip")}
              >
                VIP (4 bps)
              </button>
            </div>
          </div>

          {/* Duration */}
          <div className={s.field}>
            <div className={s.fieldLabelRow}>
              <span>Settlement Duration</span>
              <span className={s.monoVal}>{idleDays} Days</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={idleDays}
              onChange={(e) => setIdleDays(Number(e.target.value))}
              className={s.slider}
            />
          </div>

          {/* Cost of Capital */}
          <div className={s.field}>
            <div className={s.fieldLabelRow}>
              <span>Annual Cost of Capital</span>
              <span className={s.monoVal}>{(annualCapitalCost * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={0.0388}
              max={0.20}
              step={0.005}
              value={annualCapitalCost}
              onChange={(e) => setAnnualCapitalCost(Number(e.target.value))}
              className={s.slider}
            />
          </div>
        </div>

        {/* Right Column: Key Outputs & Table */}
        <div className={s.resultsCol}>
          {/* 4 Stat Boxes */}
          <div className={s.statsGrid}>
            <div className={s.statBox}>
              <span className={s.statLabel}>Net Edge</span>
              <span className={`${s.statNum} ${edgeResult.clears ? s.textLime : s.textCoral}`}>
                {formatBps(edgeResult.netEdgeBps)}
              </span>
              <span className={s.statSub}>{edgeResult.clears ? "≥ 15 bps threshold" : "Below 15 bps"}</span>
            </div>

            <div className={s.statBox}>
              <span className={s.statLabel}>Profit per Trade</span>
              <span className={`${s.statNum} ${edgeResult.clears ? s.textLime : s.textCoral}`}>
                {formatCurrency(edgeResult.netDollarProfit)}
              </span>
              <span className={s.statSub}>On {formatCurrency(tradeSize, 0)} notional</span>
            </div>

            <div className={s.statBox}>
              <span className={s.statLabel}>Monthly Estimated</span>
              <span className={`${s.statNum} ${edgeResult.clears ? s.textLime : s.textCoral}`}>
                {formatCurrency(monthlyProjectedDollar)}
              </span>
              <span className={s.statSub}>{cyclesPerMonth} rotations / mo</span>
            </div>

            <div className={s.statBox}>
              <span className={s.statLabel}>Annualized Return</span>
              <span className={`${s.statNum} ${edgeResult.clears ? s.textLime : s.textCoral}`}>
                {edgeResult.annualizedApyPercent.toFixed(1)}%
              </span>
              <span className={s.statSub}>APY basis</span>
            </div>
          </div>

          {/* Cost Waterfall Breakdown */}
          <div className={s.card}>
            <div className={s.cardHeader}>Cost Breakdown</div>
            <div className={s.ledger}>
              <div className={s.ledgerRow}>
                <span>Gross Dislocation</span>
                <span className={s.textLime}>+{grossSpreadBps.toFixed(1)} bps ({formatCurrency((grossSpreadBps / 10000) * tradeSize)})</span>
              </div>
              <div className={s.ledgerRow}>
                <span>Exchange Taker Fees</span>
                <span className={s.textCoral}>-{feePresetBps.toFixed(1)} bps (-{formatCurrency((feePresetBps / 10000) * tradeSize)})</span>
              </div>
              <div className={s.ledgerRow}>
                <span>Solana Priority Gas</span>
                <span className={s.textCoral}>-{(edgeResult.gasBps).toFixed(2)} bps (-$0.02)</span>
              </div>
              <div className={s.ledgerRow}>
                <span>Capital Carry ({idleDays}d @ {(annualCapitalCost * 100).toFixed(1)}%)</span>
                <span className={s.textCoral}>-{(edgeResult.capitalCarryBps).toFixed(2)} bps (-{formatCurrency((edgeResult.capitalCarryBps / 10000) * tradeSize)})</span>
              </div>
              <div className={`${s.ledgerRow} ${s.ledgerTotal}`}>
                <span>Net Margin</span>
                <span className={edgeResult.clears ? s.textLime : s.textCoral}>
                  {formatBps(edgeResult.netEdgeBps)} ({formatCurrency(edgeResult.netDollarProfit)})
                </span>
              </div>
            </div>
          </div>

          {/* Size Sensitivity Table */}
          <div className={s.card}>
            <div className={s.cardHeader}>Notional Sizing Sensitivity</div>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Net Edge</th>
                    <th>Profit</th>
                    <th>Breakeven Rebal</th>
                  </tr>
                </thead>
                <tbody>
                  {[1000, 5000, 10000, 25000, 50000, 100000].map((sz) => {
                    const res = calculateEdge({
                      priceBuy: 100,
                      priceSell: 100 * (1 + grossSpreadBps / 10_000),
                      feeBuyBps: feePresetBps / 2,
                      feeSellBps: feePresetBps / 2,
                      gasBuyUsd: 0,
                      gasSellUsd: 0.02,
                      rebalanceUsd: 0,
                      sizeUsd: sz,
                      annualCapitalCost,
                      idleDays,
                    });
                    return (
                      <tr key={sz} className={tradeSize === sz ? s.rowActive : ""}>
                        <td className={s.mono}>{formatCurrency(sz, 0)}</td>
                        <td className={`${s.mono} ${res.clears ? s.textLime : s.textCoral}`}>
                          {formatBps(res.netEdgeBps)}
                        </td>
                        <td className={s.mono}>{formatCurrency(res.netDollarProfit)}</td>
                        <td className={s.mono}>{formatCurrency(res.breakevenRebalanceUsd)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
