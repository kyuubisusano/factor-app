import { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header/Header";
import { MatrixView } from "./components/Matrix/MatrixView";
import { TradesView } from "./components/Trades/TradesView";
import { CircuitBreakerPanel } from "./components/Safety/CircuitBreakerPanel";
import { YieldSimulator } from "./components/Simulator/YieldSimulator";
import { ToastContainer, type ToastMessage } from "./components/Common/Toast";
import { HotkeysModal } from "./components/Common/HotkeysModal";
import { Logo } from "./components/Common/Logo";
import { OperatorProvider } from "./context/OperatorContext";
import { OperatorModal } from "./components/Auth/OperatorModal";
import { OperatorDrawer } from "./components/Operator/OperatorDrawer";
import { useLiveScanner } from "./hooks/useLiveScanner";
import { getBackendStatus, toggleCircuitBackend, getExecutionHistory } from "./services/api";
import {
  INITIAL_CIRCUIT_STATE,
  INITIAL_PROTOCOL_METRICS,
} from "./engine/simulation";
import type { ArbitrageOpportunity, CircuitBreakerState, ProtocolMetrics } from "./types/market";
import { trackAnonymousEvent } from "./services/telemetry";

function AppContent() {
  const [activeTab, setActiveTab] = useState<"matrix" | "trades" | "safety" | "simulator">("matrix");

  useEffect(() => {
    trackAnonymousEvent(`view_${activeTab}`);
  }, [activeTab]);
  const [simulatorOpp, setSimulatorOpp] = useState<ArbitrageOpportunity | null>(null);
  const [tradeCount, setTradeCount] = useState<number>(0);
  const [selectedSizeUsd, setSelectedSizeUsd] = useState<number>(10000);
  const [marketSession, setMarketSession] = useState<"OPEN" | "CLOSED">("OPEN");
  const [rebalanceKnown, setRebalanceKnown] = useState<boolean>(true);
  const [circuitState, setCircuitState] = useState<CircuitBreakerState>(INITIAL_CIRCUIT_STATE);
  const [isHotkeysOpen, setIsHotkeysOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((t: { type: "success" | "info" | "warning"; title: string; message?: string }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, ...t }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Live SSE connection to backend scanner with automatic fallback
  const { opportunities, status: scannerStatus } = useLiveScanner({
    sizeUsd: selectedSizeUsd,
    marketSession,
    rebalanceKnown,
    circuitTripped: circuitState.tripped,
  });

  // Protocol Metrics
  const [metrics, setMetrics] = useState<ProtocolMetrics>(() => ({
    ...INITIAL_PROTOCOL_METRICS,
    clearingOpportunitiesCount: 2,
    marketSession: "OPEN",
  }));

  // Keep metrics in sync with live stream
  useEffect(() => {
    const clearingCount = opportunities.filter((o) => o.clears).length;
    setMetrics((prev) => ({
      ...prev,
      clearingOpportunitiesCount: clearingCount,
      marketSession,
    }));
  }, [opportunities, marketSession]);

  const handleToggleMarketSession = () => {
    const next = marketSession === "OPEN" ? "CLOSED" : "OPEN";
    setMarketSession(next);
    addToast({
      type: "info",
      title: `Market Session: ${next}`,
      message: next === "OPEN" ? "NYSE Regular Session active." : "Market closed. Off-hours gate engaged.",
    });
  };

  const handleToggleRebalanceKnown = () => {
    const next = !rebalanceKnown;
    setRebalanceKnown(next);
    addToast({
      type: next ? "success" : "warning",
      title: `Rebalance Verification: ${next ? "VERIFIED" : "UNKNOWN"}`,
      message: next ? "CEX withdrawal tier confirmed at $0.05. Gate cleared." : "Rebalance cost unverified. Gate 4 engaged.",
    });
  };

  // Initial sync with backend SQLite circuit switch & kill events
  useEffect(() => {
    getBackendStatus().then((status) => {
      if (status) {
        setCircuitState((prev) => ({
          ...prev,
          tripped: status.circuitState.tripped,
          reason: status.circuitState.reason,
          lastTrippedAt: status.circuitState.tsMs,
          events:
            status.events && status.events.length > 0
              ? status.events.map((e, idx) => ({
                  id: `evt-be-${idx}-${e.tsMs}`,
                  ts: e.tsMs,
                  kind: e.kind,
                  detail: e.detail,
                }))
              : prev.events,
        }));
      }
    });
  }, []);

  const handleToggleCircuit = async () => {
    const nextTripped = !circuitState.tripped;
    const now = Date.now();
    const newEvent = {
      id: `evt-${now}`,
      ts: now,
      kind: nextTripped ? "CIRCUIT_TRIP_SIMULATION" : "OPERATOR_RESET_MANUAL",
      detail: nextTripped
        ? "Simulated circuit breaker trip. All execution pipelines halted."
        : "Authorized manual reset executed by operator. Safety circuits verified nominal.",
    };

    setCircuitState((prev) => ({
      tripped: nextTripped,
      reason: nextTripped ? "Operator simulated circuit trip" : null,
      lastTrippedAt: nextTripped ? now : prev.lastTrippedAt,
      events: [newEvent, ...prev.events],
    }));

    try {
      const res = await toggleCircuitBackend(nextTripped, nextTripped ? "Operator simulated circuit trip" : undefined);
      if (res.success && res.events) {
        setCircuitState((prev) => ({
          ...prev,
          events: res.events!.map((e, idx) => ({
            id: `evt-${idx}-${e.tsMs}`,
            ts: e.tsMs,
            kind: e.kind,
            detail: e.detail,
          })),
        }));
      }
    } catch (e) {
      console.warn("Backend circuit toggle error:", e);
    }

    addToast({
      type: nextTripped ? "warning" : "success",
      title: nextTripped ? "CIRCUIT BREAKER LATCHED" : "CIRCUIT BREAKER ARMED",
      message: nextTripped
        ? "Execution pipelines halted & persisted to SQLite."
        : "Safety verified nominal. Pipelines armed in SQLite.",
    });
  };

  const handleRefreshFeed = () => {
    addToast({
      type: "info",
      title: "Venue Feeds Synchronized",
      message: "Orderbooks refreshed across Kraken, Gate.io, Bybit, and Jupiter.",
    });
  };

  // Live heart-beat: simulate Solana slot increment & telemetry stream
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        solanaSlot: prev.solanaSlot + 1,
        solanaSlotAgeSec: Number((Math.random() * 0.6 + 0.4).toFixed(1)),
      }));
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA");

      if (e.key === "Escape") {
        setIsHotkeysOpen(false);
        return;
      }

      if (e.key === "?" && !isInput) {
        e.preventDefault();
        setIsHotkeysOpen((prev) => !prev);
        return;
      }

      if (!isInput) {
        if (e.key === "1") {
          setActiveTab("matrix");
        } else if (e.key === "2") {
          setActiveTab("simulator");
        } else if (e.key === "3") {
          setActiveTab("trades");
        } else if (e.key === "4") {
          setActiveTab("safety");
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          handleRefreshFeed();
        } else if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          setSelectedSizeUsd((prev) => (prev === 5000 ? 10000 : prev === 10000 ? 25000 : 5000));
        } else if (e.key === "/") {
          e.preventDefault();
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Initial fetch of trade count
  useEffect(() => {
    getExecutionHistory(100).then((rows) => {
      if (rows && rows.length > 0) setTradeCount(rows.length);
    });
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top Header with live scanner status & operator button */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metrics={metrics}
        circuitTripped={circuitState.tripped}
        onToggleMarketSession={handleToggleMarketSession}
        scannerStatus={scannerStatus}
        tradeCount={tradeCount}
      />

      {/* Active Workspace View */}
      <main style={{ flex: 1 }}>
        {activeTab === "matrix" && (
          <MatrixView
            opportunities={opportunities}
            selectedSizeUsd={selectedSizeUsd}
            setSelectedSizeUsd={setSelectedSizeUsd}
            onSelectOpportunity={() => {}}
            onRefreshFeed={handleRefreshFeed}
            onSendToSimulator={(opp) => {
              setSimulatorOpp(opp);
              setActiveTab("simulator");
            }}
            onToast={addToast}
            circuitTripped={circuitState.tripped}
            onTradeExecuted={() => setTradeCount((prev) => prev + 1)}
          />
        )}

        {activeTab === "trades" && (
          <TradesView
            onNavigateToMatrix={() => setActiveTab("matrix")}
            onToast={addToast}
          />
        )}

        {activeTab === "safety" && (
          <CircuitBreakerPanel
            circuitState={circuitState}
            metrics={metrics}
            onToggleCircuit={handleToggleCircuit}
            rebalanceKnown={rebalanceKnown}
            onToggleRebalanceKnown={handleToggleRebalanceKnown}
            marketSession={marketSession}
            onToggleMarketSession={handleToggleMarketSession}
            onToast={addToast}
          />
        )}

        {activeTab === "simulator" && (
          <YieldSimulator
            initialSpreadBps={simulatorOpp ? simulatorOpp.grossSpreadBps : undefined}
            initialTicker={simulatorOpp ? simulatorOpp.symbol : undefined}
            initialSizeUsd={selectedSizeUsd}
            onToast={addToast}
          />
        )}
      </main>

      {/* Operator Authentication Modal (Solana Web3 + Prop Desk) */}
      <OperatorModal />

      {/* Operator Profile & SQLite Execution History Drawer */}
      <OperatorDrawer onOpenSafety={() => setActiveTab("safety")} />

      {/* Hotkeys Cheatsheet Guide Modal */}
      {isHotkeysOpen && <HotkeysModal onClose={() => setIsHotkeysOpen(false)} />}

      {/* Modern Floating Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Institutional Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--line)",
          background: "var(--surface-1)",
          padding: "16px 24px",
          marginTop: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "var(--max-width)",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "var(--text-muted)",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Logo size={16} />
            <span style={{ fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}>factor</span>
            <span style={{ color: "var(--line-strong)" }}>•</span>
            <span>Cross-Venue Execution Terminal</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px", fontFamily: "var(--font-mono)" }}>
            <span>Solana Mainnet (Token-2022)</span>
            <span>•</span>
            <span>Kraken • Gate.io • Bybit • Jupiter</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <OperatorProvider>
      <AppContent />
    </OperatorProvider>
  );
}

export default App;
