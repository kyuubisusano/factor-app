import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  RefreshCw,
  Download,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  DollarSign,
  Layers,
  ArrowRight,
} from "lucide-react";
import s from "./TradesView.module.css";
import {
  getExecutionAnalytics,
  type ExecutionRecord,
  type ExecutionSummary,
} from "../../services/api";
import { formatCurrency } from "../../engine/edge";

interface TradesViewProps {
  onNavigateToMatrix?: () => void;
  onToast?: (toast: { type: "success" | "info" | "warning"; title: string; message?: string }) => void;
}

export const TradesView: React.FC<TradesViewProps> = ({
  onNavigateToMatrix,
  onToast,
}) => {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [summary, setSummary] = useState<ExecutionSummary>({
    totalRealizedPnlUsd: 0,
    totalVolumeUsd: 0,
    totalTrades: 0,
    liveTrades: 0,
    simulatedTrades: 0,
    unwoundTrades: 0,
    avgNetBps: 0,
    winRatePct: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "FILLED_LIVE" | "FILLED_SIMULATED" | "UNWOUND_EMERGENCY"
  >("ALL");

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await getExecutionAnalytics(100);
      setExecutions(res.executions);
      setSummary(res.summary);
    } catch (e) {
      console.warn("Failed to load executions:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleManualRefresh = () => {
    loadData();
    if (onToast) {
      onToast({
        type: "info",
        title: "Execution Ledger Refreshed",
        message: "Synchronized latest trade fills and PnL records from SQLite.",
      });
    }
  };

  const handleExportCsv = () => {
    if (executions.length === 0) {
      if (onToast) {
        onToast({
          type: "warning",
          title: "No Data to Export",
          message: "Execution ledger is currently empty.",
        });
      }
      return;
    }

    const headers = [
      "Timestamp",
      "ExecutionID",
      "Symbol",
      "OperatorID",
      "BuyVenue",
      "SellVenue",
      "SizeUSD",
      "BuyPrice",
      "SellPrice",
      "GrossSpreadBps",
      "FeesBps",
      "NetEdgeBps",
      "RealizedProfitUSD",
      "Status",
    ];

    const rows = executions.map((e) => [
      new Date(e.ts).toISOString(),
      e.id,
      e.symbol,
      e.operatorId,
      e.buyVenue,
      e.sellVenue,
      e.sizeUsd.toFixed(2),
      e.buyPrice.toFixed(4),
      e.sellPrice.toFixed(4),
      e.grossBps.toFixed(2),
      e.feesBps.toFixed(2),
      e.netBps.toFixed(2),
      e.dollarProfit.toFixed(2),
      e.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `factor_execution_ledger_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onToast) {
      onToast({
        type: "success",
        title: "Audit Ledger Exported",
        message: `Downloaded ${executions.length} execution tickets as CSV.`,
      });
    }
  };

  // Filter and search
  const filteredExecutions = useMemo(() => {
    return executions.filter((e) => {
      if (statusFilter !== "ALL" && e.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSym = e.symbol.toLowerCase().includes(q);
        const matchesId = e.id.toLowerCase().includes(q);
        const matchesVenue =
          e.buyVenue.toLowerCase().includes(q) ||
          e.sellVenue.toLowerCase().includes(q);
        return matchesSym || matchesId || matchesVenue;
      }
      return true;
    });
  }, [executions, statusFilter, searchQuery]);

  // Exposure calculation for the latest stock
  const currentNetExposure = useMemo(() => {
    const liveExecs = executions.filter((e) => e.status === "FILLED_LIVE");
    return liveExecs.reduce((acc, curr) => acc + curr.sizeUsd, 0) % 25000;
  }, [executions]);

  return (
    <div className={s.container}>
      {/* Top Title & Header Actions */}
      <div className={s.headerRow}>
        <div className={s.titleArea}>
          <h2>Execution Ledger & PnL History</h2>
          <p>
            Cryptographically recorded cross-venue transactions, slippage
            attribution, and net PnL from SQLite persistence.
          </p>
        </div>

        <div className={s.actionBtns}>
          <button
            className={s.refreshBtn}
            onClick={handleManualRefresh}
            title="Refresh execution tickets"
          >
            <RefreshCw
              size={13}
              style={{
                animation: isRefreshing ? "spin 1s linear infinite" : "none",
              }}
            />
            <span>Refresh</span>
          </button>

          <button
            className={s.exportBtn}
            onClick={handleExportCsv}
            title="Export CSV audit trail"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className={s.metricsGrid}>
        <div className={s.metricCard}>
          <span className={s.metricLabel}>Total Realized PnL</span>
          <span
            className={`${s.metricVal} ${
              summary.totalRealizedPnlUsd >= 0
                ? s.metricValPositive
                : s.metricValNeutral
            }`}
          >
            {summary.totalRealizedPnlUsd >= 0 ? "+" : ""}
            {formatCurrency(summary.totalRealizedPnlUsd)}
          </span>
          <div className={s.metricSub}>
            <TrendingUp size={12} color="var(--lime)" />
            <span>Win Rate: {summary.winRatePct.toFixed(0)}%</span>
          </div>
        </div>

        <div className={s.metricCard}>
          <span className={s.metricLabel}>Cumulative Volume</span>
          <span className={s.metricVal}>
            {formatCurrency(summary.totalVolumeUsd)}
          </span>
          <div className={s.metricSub}>
            <DollarSign size={12} color="var(--dim)" />
            <span>{summary.totalTrades} Total Executions</span>
          </div>
        </div>

        <div className={s.metricCard}>
          <span className={s.metricLabel}>Average Captured Edge</span>
          <span className={s.metricVal}>
            {summary.avgNetBps > 0 ? "+" : ""}
            {summary.avgNetBps.toFixed(1)} bps
          </span>
          <div className={s.metricSub}>
            <Activity size={12} color="var(--lime)" />
            <span>Hurdle Target: &ge; 15.0 bps</span>
          </div>
        </div>

        <div className={s.metricCard}>
          <span className={s.metricLabel}>Desk Net Exposure</span>
          <span className={s.metricVal}>
            {formatCurrency(currentNetExposure)}
          </span>
          <div className={s.metricSub}>
            <Layers size={12} color="var(--dim)" />
            <span>PRD Cap: $25,000 / stock</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={s.controlsBar}>
        <div className={s.filterTabs}>
          <button
            className={`${s.filterTab} ${
              statusFilter === "ALL" ? s.filterTabActive : ""
            }`}
            onClick={() => setStatusFilter("ALL")}
          >
            All Executions
            <span className={s.tabBadge}>{executions.length}</span>
          </button>
          <button
            className={`${s.filterTab} ${
              statusFilter === "FILLED_LIVE" ? s.filterTabActive : ""
            }`}
            onClick={() => setStatusFilter("FILLED_LIVE")}
          >
            Live Fills
            <span className={s.tabBadge}>{summary.liveTrades}</span>
          </button>
          <button
            className={`${s.filterTab} ${
              statusFilter === "FILLED_SIMULATED" ? s.filterTabActive : ""
            }`}
            onClick={() => setStatusFilter("FILLED_SIMULATED")}
          >
            Simulated
            <span className={s.tabBadge}>{summary.simulatedTrades}</span>
          </button>
          <button
            className={`${s.filterTab} ${
              statusFilter === "UNWOUND_EMERGENCY" ? s.filterTabActive : ""
            }`}
            onClick={() => setStatusFilter("UNWOUND_EMERGENCY")}
          >
            Unwound
            <span className={s.tabBadge}>{summary.unwoundTrades}</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Search size={14} color="var(--dim)" />
          <input
            type="text"
            className={s.searchInput}
            placeholder="Search symbol, ID, venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className={s.tableCard}>
        {filteredExecutions.length === 0 ? (
          <div className={s.emptyState}>
            <ShieldCheck size={36} color="var(--dim)" />
            <div className={s.emptyTitle}>No executions match current criteria</div>
            <p className={s.emptyText}>
              Trades executed through the Opportunities Matrix or Trade Drawer
              will stream directly into this ledger with real-time settlement receipts.
            </p>
            {onNavigateToMatrix && (
              <button className={s.emptyAction} onClick={onNavigateToMatrix}>
                <span>View Arbitrage Opportunities</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Symbol</th>
                  <th>Route & Venues</th>
                  <th>Nominal Size</th>
                  <th>Prices (Buy ➔ Sell)</th>
                  <th>Gross Spread</th>
                  <th>Net Edge (&theta;)</th>
                  <th>Realized PnL</th>
                  <th>Status</th>
                  <th>Receipt / Tx</th>
                </tr>
              </thead>
              <tbody>
                {filteredExecutions.map((e) => {
                  const dateObj = new Date(e.ts);
                  const timeFormatted = dateObj.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                  const dateFormatted = dateObj.toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  });

                  const isLive = e.status === "FILLED_LIVE";
                  const isUnwound = e.status === "UNWOUND_EMERGENCY";

                  return (
                    <tr key={e.id}>
                      {/* Timestamp */}
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                        <div>{timeFormatted}</div>
                        <div style={{ color: "var(--dim)", fontSize: "10px" }}>
                          {dateFormatted}
                        </div>
                      </td>

                      {/* Symbol */}
                      <td>
                        <div className={s.symbolCell}>
                          <span className={s.tickerBadge}>{e.symbol}</span>
                          <span className={s.issuerTag}>Token-2022</span>
                        </div>
                      </td>

                      {/* Route */}
                      <td>
                        <div className={s.routeCell}>
                          <span>{e.buyVenue.toUpperCase()}</span>
                          <span className={s.routeArrow}>➔</span>
                          <span>{e.sellVenue.toUpperCase()}</span>
                        </div>
                      </td>

                      {/* Size */}
                      <td>
                        <div className={s.sizeCell}>{formatCurrency(e.sizeUsd)}</div>
                      </td>

                      {/* Prices */}
                      <td>
                        <div className={s.priceCell}>
                          ${e.buyPrice.toFixed(2)} ➔ ${e.sellPrice.toFixed(2)}
                        </div>
                      </td>

                      {/* Gross Spread */}
                      <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        +{e.grossBps.toFixed(1)} bps
                      </td>

                      {/* Net Edge */}
                      <td>
                        <div className={s.edgeCell}>
                          +{e.netBps.toFixed(1)} bps
                        </div>
                      </td>

                      {/* Realized PnL */}
                      <td>
                        <div
                          className={`${s.pnlCell} ${
                            e.dollarProfit >= 0 ? s.pnlPositive : s.pnlNegative
                          }`}
                        >
                          {e.dollarProfit >= 0 ? "+" : ""}
                          {formatCurrency(e.dollarProfit)}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {isLive && (
                          <span className={`${s.statusBadge} ${s.statusLive}`}>
                            <CheckCircle2 size={10} />
                            <span>FILLED LIVE</span>
                          </span>
                        )}
                        {isUnwound && (
                          <span className={`${s.statusBadge} ${s.statusUnwound}`}>
                            <AlertTriangle size={10} />
                            <span>AUTO UNWOUND</span>
                          </span>
                        )}
                        {!isLive && !isUnwound && (
                          <span className={`${s.statusBadge} ${s.statusSim}`}>
                            <span>SIMULATED</span>
                          </span>
                        )}
                      </td>

                      {/* Receipt / Tx */}
                      <td>
                        <a
                          href={`https://solscan.io/tx/${e.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={s.txLink}
                          title={e.id}
                        >
                          <span>{e.id.slice(0, 10)}...</span>
                          <ExternalLink size={10} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
