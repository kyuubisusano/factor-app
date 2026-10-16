import React, { useState, useEffect } from "react";
import { X, Sliders, History, ShieldAlert } from "lucide-react";
import s from "./OperatorDrawer.module.css";
import { useOperator } from "../../context/OperatorContext";
import { getExecutionHistory, type ExecutionRecord } from "../../services/api";

interface OperatorDrawerProps {
  onOpenSafety?: () => void;
}

export const OperatorDrawer: React.FC<OperatorDrawerProps> = ({ onOpenSafety }) => {
  const {
    operator,
    isOperatorDrawerOpen,
    closeOperatorDrawer,
    logout,
    updateRiskSettings,
    openOperatorModal,
  } = useOperator();
  const [history, setHistory] = useState<ExecutionRecord[]>([]);

  useEffect(() => {
    if (isOperatorDrawerOpen) {
      getExecutionHistory(15).then((rows) => {
        setHistory(rows);
      });
    }
  }, [isOperatorDrawerOpen]);

  if (!isOperatorDrawerOpen || !operator) return null;

  return (
    <>
      <div className={s.backdrop} onClick={closeOperatorDrawer} />
      <aside className={s.drawer}>
        {/* Header */}
        <div className={s.head}>
          <div className={s.titleArea}>
            <h3>Connected Wallet</h3>
            <span className={s.statusText}>Solana Mainnet</span>
          </div>
          <button className={s.closeBtn} onClick={closeOperatorDrawer}>
            <X size={16} />
          </button>
        </div>

        {/* Scroll Content */}
        <div className={s.scrollArea}>
          {/* Operator Identity Card */}
          <div className={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className={s.cardTitle}>Wallet Identity</div>
              {operator.isSimulated ? (
                <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--dim)", background: "var(--surface-3)", padding: "1px 6px", borderRadius: "3px" }}>
                  DEMO SIMULATION
                </span>
              ) : (
                <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--lime)", background: "rgba(212, 245, 92, 0.1)", border: "1px solid var(--lime-border)", padding: "1px 6px", borderRadius: "3px" }}>
                  VERIFIED EXTENSION
                </span>
              )}
            </div>

            <div className={s.infoRow}>
              <span className={s.infoLabel}>Provider</span>
              <span className={s.infoVal}>{operator.label}</span>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Address</span>
              <span className={s.infoVal} style={{ fontFamily: "var(--font-mono)", color: "var(--lime)", wordBreak: "break-all", textAlign: "right", maxWidth: "240px", fontSize: "11px" }}>
                {operator.address}
              </span>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Token Standard</span>
              <span className={s.infoVal}>Token-2022 Extensions</span>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Settlement Balance</span>
              <span className={s.infoVal} style={{ color: "var(--text)" }}>
                {operator.simulatedBalanceSol.toFixed(2)} SOL
              </span>
            </div>
          </div>

          {/* Custom Risk Parameters */}
          <div className={s.card}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Sliders size={13} color="var(--dim)" />
              <div className={s.cardTitle}>Desk Risk Limits</div>
            </div>

            <div className={s.sliderRow}>
              <div className={s.infoRow}>
                <span className={s.infoLabel}>Clearance Hurdle</span>
                <span className={s.infoVal}>{operator.riskFloorBps.toFixed(1)} bps</span>
              </div>
              <input
                type="range"
                min={10}
                max={30}
                step={0.5}
                value={operator.riskFloorBps}
                onChange={(e) => updateRiskSettings({ riskFloorBps: parseFloat(e.target.value) })}
                className={s.sliderInput}
              />
              <div className={s.sliderMeta}>
                <span>10.0 bps (Aggressive)</span>
                <span>30.0 bps (Conservative)</span>
              </div>
            </div>

            <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--line)" }}>
              <button
                type="button"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-3)",
                  border: "1px solid var(--line-strong)",
                  color: "var(--text)",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "var(--transition)",
                }}
                onClick={() => {
                  closeOperatorDrawer();
                  if (onOpenSafety) onOpenSafety();
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <ShieldAlert size={13} color="var(--lime)" />
                  <span>Circuit Breaker & Safety Governance</span>
                </span>
                <span style={{ color: "var(--dim)", fontSize: "11px" }}>&rarr;</span>
              </button>
            </div>
          </div>

          {/* SQLite Execution History */}
          <div className={s.card}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <History size={13} color="var(--dim)" />
              <div className={s.cardTitle}>Recent Executions (SQLite)</div>
            </div>

            <div className={s.historyList}>
              {history.length === 0 ? (
                <div className={s.emptyHistory}>No simulated trades logged in SQLite yet.</div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className={s.historyItem}>
                    <div className={s.historyHead}>
                      <span>{item.symbol} (${(item.sizeUsd / 1000).toFixed(0)}k)</span>
                      <span className={s.historyProfit}>+${item.dollarProfit.toFixed(2)}</span>
                    </div>
                    <div className={s.historyMeta}>
                      <span>{item.buyVenue} &rarr; {item.sellVenue}</span>
                      <span>+{item.netBps.toFixed(1)} bps</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={s.footer}>
          <button
            className={s.switchBtn}
            onClick={() => {
              closeOperatorDrawer();
              openOperatorModal();
            }}
          >
            Change Wallet
          </button>
          <button className={s.disconnectBtn} onClick={logout}>
            Disconnect
          </button>
        </div>
      </aside>
    </>
  );
};
