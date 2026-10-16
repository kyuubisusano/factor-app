import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";
import s from "./CircuitBreakerPanel.module.css";
import type { CircuitBreakerState, ProtocolMetrics } from "../../types/market";
import { getDailyReportsBackend, type DailyGateSummary } from "../../services/api";

interface CircuitBreakerPanelProps {
  circuitState: CircuitBreakerState;
  metrics: ProtocolMetrics;
  onToggleCircuit: () => void;
  rebalanceKnown: boolean;
  onToggleRebalanceKnown: () => void;
  marketSession: "OPEN" | "CLOSED";
  onToggleMarketSession: () => void;
  onToast?: (toast: { type: "success" | "info" | "warning"; title: string; message?: string }) => void;
}

export const CircuitBreakerPanel: React.FC<CircuitBreakerPanelProps> = ({
  circuitState,
  metrics,
  onToggleCircuit,
  rebalanceKnown,
  onToggleRebalanceKnown,
  marketSession,
  onToggleMarketSession,
  onToast,
}) => {
  const [logFilter, setLogFilter] = useState<string>("ALL");
  const [dailyReports, setDailyReports] = useState<DailyGateSummary[]>([]);

  useEffect(() => {
    getDailyReportsBackend().then(setDailyReports);
  }, []);

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(circuitState.events, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `factor-circuit-audit-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    if (onToast) {
      onToast({
        type: "success",
        title: "Audit Log Exported",
        message: `Saved ${circuitState.events.length} circuit events.`,
      });
    }
  };

  const filteredEvents = circuitState.events.filter((evt) => {
    if (logFilter !== "ALL" && !evt.kind.includes(logFilter)) return false;
    return true;
  });

  return (
    <div className={s.container}>
      {/* Top Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Risk Controls &amp; Safety Circuit</h1>
          <p className={s.subtitle}>
            Deterministic pre-execution verification gates and hardware-latched fail-safe.
          </p>
        </div>
      </div>

      {/* Control Strip */}
      <div className={s.controlStrip}>
        <div className={s.statusGroup}>
          <div className={s.statusInfo}>
            <span className={s.statusLabel}>Hardware Breaker</span>
            <span className={circuitState.tripped ? s.statusTrippedText : s.statusArmedText}>
              {circuitState.tripped ? "Tripped — Execution Suspended" : "Nominal — Latched Active"}
            </span>
          </div>
          <button
            className={`${s.latchBtn} ${circuitState.tripped ? s.latchReset : s.latchTrip}`}
            onClick={onToggleCircuit}
          >
            {circuitState.tripped ? "Reset Breaker" : "Test Trip"}
          </button>
        </div>

        <div className={s.divider} />

        {/* Environment Telemetry */}
        <div className={s.telemetryCluster}>
          <div
            className={s.telemetryBlock}
            onClick={onToggleMarketSession}
            role="button"
            tabIndex={0}
            title="Click to toggle NYSE session simulation"
          >
            <span className={s.telemetryLabel}>NYSE Calendar</span>
            <span className={`${s.telemetryValue} ${marketSession === "OPEN" ? s.valNominal : s.valGated}`}>
              {marketSession === "OPEN" ? "09:30–16:00 ET (Regular)" : "Off-Hours Gated"}
            </span>
          </div>

          <div className={s.subDivider} />

          <div
            className={s.telemetryBlock}
            onClick={onToggleRebalanceKnown}
            role="button"
            tabIndex={0}
            title="Click to toggle CEX transfer rebalance verification"
          >
            <span className={s.telemetryLabel}>Rebalance Friction</span>
            <span className={`${s.telemetryValue} ${rebalanceKnown ? s.valNominal : s.valGated}`}>
              {rebalanceKnown ? "$0.05 / tx (Confirmed)" : "Cost Unverified"}
            </span>
          </div>
        </div>
      </div>

      {/* Latency Strip */}
      <div className={s.latencyStrip}>
        <div className={s.latBox}>
          <span className={s.latLabel}>Kraken WS</span>
          <span className={s.latVal}>21 ms</span>
        </div>
        <div className={s.latBox}>
          <span className={s.latLabel}>Gate.io WS</span>
          <span className={s.latVal}>34 ms</span>
        </div>
        <div className={s.latBox}>
          <span className={s.latLabel}>Bybit WS</span>
          <span className={s.latVal}>28 ms</span>
        </div>
        <div className={s.latBox}>
          <span className={s.latLabel}>Jupiter RPC (#{metrics.solanaSlot.toString().slice(-4)})</span>
          <span className={s.latVal}>42 ms</span>
        </div>
      </div>

      {/* Phase 0 PRD Exit-Gate Status */}
      <div className={s.gateSummaryStrip}>
        <div className={s.gateSummaryLeft}>
          <div className={s.gateSummaryTitle}>
            <span>PRD Phase 0 Exit-Gate: 14 Consecutive Valid Days</span>
          </div>
          <div className={s.gateSummaryDesc}>
            Requires a steady daily count of opportunities above &theta; (15.0 bps) with verified CEX-wallet rebalance friction.
          </div>
        </div>
        <div className={s.gateSummaryMetrics}>
          <div className={s.gateMetricBox}>
            <span className={s.gateMetricLabel}>Consecutive Days</span>
            <span className={s.gateMetricVal}>{dailyReports.length} / 14</span>
          </div>
          <div className={s.gateMetricBox}>
            <span className={s.gateMetricLabel}>Rebalance Status</span>
            <span className={s.gateMetricVal} style={{ color: rebalanceKnown ? "var(--lime)" : "var(--amber)" }}>
              {rebalanceKnown ? "Model Verified" : "Cost Unverified"}
            </span>
          </div>
          <div className={s.gateMetricBox}>
            <span className={s.gateMetricLabel}>Gate Readiness</span>
            <span className={s.gateMetricVal} style={{ color: "var(--mute)" }}>
              Awaiting Live Verification
            </span>
          </div>
        </div>
      </div>

      {/* The 6 Detailed Gates Grid */}
      <div className={s.gatesGrid}>
        {/* Gate 1 */}
        <div className={s.gateCard}>
          <div className={s.gateHeader}>
            <span className={s.gateNum}>GATE 01</span>
            <span className={s.gateStatusNominal}>Nominal (&ge; 15 bps)</span>
          </div>
          <div className={s.gateTitle}>Net Edge Residual &ge; 15 bps</div>
          <div className={s.gateDesc}>
            Executable spread must exceed explicit taker fees, gas ceiling, and capital carry by at least 15 bps (&theta; = 0.0015).
          </div>
        </div>

        {/* Gate 2 */}
        <div className={s.gateCard}>
          <div className={s.gateHeader}>
            <span className={s.gateNum}>GATE 02</span>
            <span className={s.gateStatusNominal}>Synced (3 Feeds)</span>
          </div>
          <div className={s.gateTitle}>3-Source Reference Agreement</div>
          <div className={s.gateDesc}>
            Reference median from Nasdaq, Hyperliquid XYZ, and xStocks prints. Maximum divergence allowable &le; 300 bps (3.0%).
          </div>
        </div>

        {/* Gate 3 */}
        <div className={s.gateCard}>
          <div className={s.gateHeader}>
            <span className={s.gateNum}>GATE 03</span>
            <span className={marketSession === "OPEN" ? s.gateStatusNominal : s.gateStatusGated}>
              {marketSession === "OPEN" ? "Regular Session Active" : "Off-Hours Gated"}
            </span>
          </div>
          <div className={s.gateTitle}>NYSE Regular Session Schedule</div>
          <div className={s.gateDesc}>
            09:30–16:00 ET calendar verification. Prevents executing against illiquid off-market CEX orderbooks.
          </div>
        </div>

        {/* Gate 4 */}
        <div className={s.gateCard}>
          <div className={s.gateHeader}>
            <span className={s.gateNum}>GATE 04</span>
            <span className={rebalanceKnown ? s.gateStatusNominal : s.gateStatusTripped}>
              {rebalanceKnown ? "Confirmed ($0.05)" : "Friction Unverified"}
            </span>
          </div>
          <div className={s.gateTitle}>Inventory Rebalance Verification</div>
          <div className={s.gateDesc}>
            CEX withdrawal tier cost verification. Row execution is paused until actual transfer friction is confirmed.
          </div>
        </div>

        {/* Gate 5 */}
        <div className={s.gateCard}>
          <div className={s.gateHeader}>
            <span className={s.gateNum}>GATE 05</span>
            <span className={s.gateStatusNominal}>Clear (&plusmn;10m Safe)</span>
          </div>
          <div className={s.gateTitle}>Corporate Action Hold Window</div>
          <div className={s.gateDesc}>
            Token-2022 Scaled UI Amount updates scheduled on-chain hold execution for &plusmn;10 minutes around activation.
          </div>
        </div>

        {/* Gate 6 */}
        <div className={s.gateCard}>
          <div className={s.gateHeader}>
            <span className={s.gateNum}>GATE 06</span>
            <span className={!circuitState.tripped ? s.gateStatusNominal : s.gateStatusTripped}>
              {!circuitState.tripped ? "Latched Operational" : "Hardware Tripped"}
            </span>
          </div>
          <div className={s.gateTitle}>Latched Fail-Safe Breaker</div>
          <div className={s.gateDesc}>
            Persistent hardware latch. Automatically engages on reference stall &ge; 60s, slot age &gt; 120s, or quote errors.
          </div>
        </div>
      </div>

      {/* Audit History */}
      <div className={s.logSection}>
        <div className={s.logHeader}>
          <span className={s.logTitle}>Circuit Event History</span>
          <div className={s.logActions}>
            <div className={s.filterBtns}>
              {["ALL", "CIRCUIT", "AUDIT"].map((f) => (
                <button
                  key={f}
                  className={`${s.filterBtn} ${logFilter === f ? s.filterBtnActive : ""}`}
                  onClick={() => setLogFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            <button className={s.exportBtn} onClick={handleExportLogs}>
              <Download size={12} />
              <span>Export</span>
            </button>
          </div>
        </div>

        <table className={s.logTable}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Event</th>
              <th>Detail</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((evt) => (
              <tr key={evt.id}>
                <td className={s.mono}>{new Date(evt.ts).toLocaleTimeString()}</td>
                <td>
                  <span className={s.kindTag}>{evt.kind}</span>
                </td>
                <td className={s.detailCol}>{evt.detail}</td>
                <td>
                  <span className={s.passTag}>Verified</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
