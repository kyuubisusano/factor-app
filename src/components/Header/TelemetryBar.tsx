import React from "react";
import s from "./TelemetryBar.module.css";
import type { ProtocolMetrics } from "../../types/market";
import { formatCurrency } from "../../engine/edge";

interface TelemetryBarProps {
  metrics: ProtocolMetrics;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({ metrics }) => {
  return (
    <div className={s.bar}>
      <div className={s.barInner}>
        <div className={s.item}>
          <span className={s.label}>Monitored Liquidity</span>
          <span className={s.val}>{formatCurrency(metrics.totalMonitoredLiquidityUsd, 0)}</span>
        </div>

        <span className={s.dot}>•</span>

        <div className={s.item}>
          <span className={s.label}>Clearing Spreads</span>
          <span className={`${s.val} ${s.valLime}`}>
            {metrics.clearingOpportunitiesCount} <span className={s.sub}>/ {metrics.activePairsCount} evaluated</span>
          </span>
        </div>

        <span className={s.dot}>•</span>

        <div className={s.item}>
          <span className={s.label}>SOFR Capital Floor</span>
          <span className={s.val}>{(metrics.sofrBenchmarkRate * 100).toFixed(2)}%</span>
        </div>

        <span className={s.dot}>•</span>

        <div className={s.item}>
          <span className={s.label}>Execution Threshold</span>
          <span className={s.val}>&ge; 15.0 bps</span>
        </div>

        <span className={s.dot}>•</span>

        <div className={s.item}>
          <span className={s.label}>L1 Slot Latency</span>
          <span className={s.val}>{metrics.solanaSlotAgeSec}s</span>
        </div>
      </div>
    </div>
  );
};
