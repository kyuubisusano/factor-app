import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  RefreshCw,
  Copy,
  Check,
  ArrowUpRight,
  Layers,
} from "lucide-react";
import s from "./MatrixView.module.css";
import type { ArbitrageOpportunity, VenueId } from "../../types/market";
import { formatBps, formatCurrency, calculateEdge } from "../../engine/edge";
import { DislocationModal } from "../Inspector/DislocationModal";
import { TradeDrawer } from "../Execution/TradeDrawer";
import { normalizeCategory } from "../../hooks/useLiveScanner";

interface MatrixViewProps {
  opportunities: ArbitrageOpportunity[];
  selectedSizeUsd: number;
  setSelectedSizeUsd: (size: number) => void;
  onSelectOpportunity: (opp: ArbitrageOpportunity) => void;
  onRefreshFeed: () => void;
  onSendToSimulator?: (opp: ArbitrageOpportunity) => void;
  onToast?: (toast: { type: "success" | "info" | "warning"; title: string; message?: string }) => void;
  circuitTripped?: boolean;
  onTradeExecuted?: () => void;
}

export const MatrixView: React.FC<MatrixViewProps> = ({
  opportunities,
  selectedSizeUsd,
  setSelectedSizeUsd,
  onRefreshFeed,
  onToast,
  circuitTripped = false,
  onTradeExecuted,
}) => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [clearingOnly, setClearingOnly] = useState<boolean>(false);
  const [copiedMint, setCopiedMint] = useState<string | null>(null);

  // Active selected opportunity for the right-hand inspector
  const [activeOppId, setActiveOppId] = useState<string | null>(null);

  // Inspector dynamic sizing slider
  const [inspectorSize, setInspectorSize] = useState<number>(selectedSizeUsd || 10000);

  const categories = [
    "all",
    "Mega Tech",
    "Semiconductors",
    "Index ETFs",
    "Fintech & Crypto",
    "Value & Growth",
  ];

  // Live count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: opportunities.length,
      "Mega Tech": 0,
      "Semiconductors": 0,
      "Index ETFs": 0,
      "Fintech & Crypto": 0,
      "Value & Growth": 0,
    };
    opportunities.forEach((o) => {
      const cat = normalizeCategory(o.category);
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    const filtered = opportunities.filter((opp) => {
      if (selectedCategory !== "all") {
        const oppCat = normalizeCategory(opp.category);
        const selCat = normalizeCategory(selectedCategory);
        if (oppCat !== selCat) return false;
      }
      if (clearingOnly && !opp.clears) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          opp.underlying.toLowerCase().includes(query) ||
          opp.symbol.toLowerCase().includes(query) ||
          opp.name.toLowerCase().includes(query) ||
          opp.buyVenue.toLowerCase().includes(query) ||
          opp.sellVenue.toLowerCase().includes(query)
        );
      }
      return true;
    });

    return [...filtered].sort((a, b) => b.netEdgeBps - a.netEdgeBps);
  }, [opportunities, selectedCategory, clearingOnly, search]);

  // Determine active opportunity
  const activeOpp = useMemo(() => {
    if (activeOppId) {
      const found = opportunities.find((o) => o.id === activeOppId);
      if (found) return found;
    }
    // Default to the first clearing opportunity or first opportunity
    const firstClearing = filteredOpportunities.find((o) => o.clears);
    return firstClearing || filteredOpportunities[0] || opportunities[0];
  }, [activeOppId, filteredOpportunities, opportunities]);

  const handleCopyMint = (e: React.MouseEvent, mint: string, symbol: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(mint);
    setCopiedMint(mint);
    setTimeout(() => setCopiedMint(null), 1500);
    if (onToast) {
      onToast({
        type: "success",
        title: "Mint Copied",
        message: `${symbol}: ${mint.slice(0, 6)}...${mint.slice(-4)}`,
      });
    }
  };

  // Calculate live breakdown for the inspector based on selected size
  const edgeResult = useMemo(() => {
    if (!activeOpp) return null;
    return calculateEdge({
      priceBuy: activeOpp.buyPrice,
      priceSell: activeOpp.sellPrice,
      feeBuyBps: activeOpp.feesBps / 2,
      feeSellBps: activeOpp.feesBps / 2,
      gasBuyUsd: 0,
      gasSellUsd: 0.02,
      rebalanceUsd: 0.05,
      sizeUsd: inspectorSize,
      annualCapitalCost: 0.10,
      idleDays: 2,
    });
  }, [activeOpp, inspectorSize]);

  const venueLabel = (venue: VenueId) => {
    switch (venue) {
      case "kraken": return "Kraken";
      case "gate": return "Gate.io";
      case "bybit": return "Bybit";
      case "jupiter": return "Jupiter";
    }
  };

  const [isDislocationOpen, setIsDislocationOpen] = useState(false);
  const [isTradeDrawerOpen, setIsTradeDrawerOpen] = useState(false);


  const clearingCount = opportunities.filter((o) => o.clears).length;

  return (
    <div className={s.container}>
      {/* Streamlined Master Control Strip */}
      <div className={s.controlStrip}>
        <div className={s.leftControls}>
          {/* Search Box */}
          <div className={s.searchBox}>
            <Search size={13} className={s.searchIcon} />
            <input
              type="text"
              placeholder="Search ticker, name, or route..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={s.searchInput}
            />
            {search && (
              <button className={s.clearBtn} onClick={() => setSearch("")}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className={s.categoryGroup}>
            {categories.map((cat) => {
              const count = categoryCounts[cat] ?? 0;
              return (
                <button
                  key={cat}
                  className={`${s.categoryBtn} ${selectedCategory === cat ? s.categoryBtnActive : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  <span>{cat === "all" ? "All Pairs" : cat}</span>
                  <span className={s.catCountBadge}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Hurdle Filter Toggle */}
          <button
            className={`${s.filterHurdle} ${clearingOnly ? s.filterHurdleActive : ""}`}
            onClick={() => setClearingOnly(!clearingOnly)}
          >
            <span>&ge; 15 bps Cleared ({clearingCount})</span>
          </button>
        </div>

        {/* Telemetry Summary & Refresh */}
        <div className={s.rightControls}>
          <div className={s.telemetryPills}>
            <span className={s.telemetryItem}>
              Evaluated: <strong>{opportunities.length} pairs</strong>
            </span>
            <span>•</span>
            <span className={s.telemetryItem}>
              Threshold: <strong>&ge; 15 bps</strong>
            </span>
          </div>

          <button className={s.refreshBtn} onClick={onRefreshFeed} title="Refresh live orderbooks">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Master-Detail Workspace */}
      <div className={s.workspace}>
        {/* Left Side: Master Opportunities Table */}
        <div className={s.feedCard}>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Asset &amp; Route</th>
                  <th className={s.thRight}>Prices (Buy / Sell)</th>
                  <th className={s.thRight}>Net Edge</th>
                  <th className={s.thRight}>Decision</th>
                </tr>
              </thead>
              <tbody>
                {filteredOpportunities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={s.emptyState}>
                      No opportunities match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredOpportunities.map((opp) => {
                    const isSelected = activeOpp?.id === opp.id;
                    return (
                      <tr
                        key={opp.id}
                        className={isSelected ? s.rowSelected : ""}
                        onClick={() => {
                          setActiveOppId(opp.id);
                        }}
                      >
                        {/* Asset & Route */}
                        <td className={s.tdAsset}>
                          <div className={s.assetGroup}>
                            <div className={s.assetPrimary}>
                              <span className={s.ticker}>{opp.symbol}</span>
                              <span className={s.assetName}>{opp.name}</span>
                            </div>
                            <div className={s.routeLine}>
                              <span className={s.routeVenues}>
                                {venueLabel(opp.buyVenue)} &rarr; {venueLabel(opp.sellVenue)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Prices */}
                        <td className={s.tdPrices}>
                          <div className={s.priceGroup}>
                            <div className={s.pricePrimary}>
                              {formatCurrency(opp.buyPrice)} &bull; {formatCurrency(opp.sellPrice)}
                            </div>
                            <div className={s.priceSub}>
                              Ask &bull; Bid
                            </div>
                          </div>
                        </td>

                        {/* Margin */}
                        <td className={s.tdMargin}>
                          <div className={s.marginGroup}>
                            <span
                              className={`${s.netEdge} ${
                                opp.clears
                                  ? s.edgeGreen
                                  : opp.netEdgeBps > 0
                                  ? s.edgeMuted
                                  : s.edgeRed
                              }`}
                            >
                              {formatBps(opp.netEdgeBps)}
                            </span>
                            <span className={s.grossSpread}>
                              {formatBps(opp.grossSpreadBps)} gross
                            </span>
                          </div>
                        </td>

                        {/* Decision */}
                        <td className={s.tdDecision}>
                          {opp.clears ? (
                            <span className={s.statusExecutable}>Executable</span>
                          ) : !opp.gates.marketOpen ? (
                            <span className={s.statusGated}>Off-Hours</span>
                          ) : (
                            <span className={s.statusSubHurdle}>&mdash;</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Docked Trade Check & Simulator Inspector */}
        {activeOpp && edgeResult && (
          <aside className={s.inspectorCard}>
            <div className={s.inspectorBox}>
              {/* Header */}
              <div className={s.inspectorHead}>
                <div>
                  <div className={s.headTicker}>
                    {activeOpp.symbol}
                  </div>
                  <div className={s.headSub}>
                    {activeOpp.name} &bull; {venueLabel(activeOpp.buyVenue)} &rarr; {venueLabel(activeOpp.sellVenue)}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    className={s.mintCopyBtn}
                    onClick={() => setIsDislocationOpen(true)}
                    title="Inspect Orderbook Depth & Settlement Intent"
                  >
                    <Layers size={11} />
                    <span>Depth</span>
                  </button>
                  <button
                    className={s.mintCopyBtn}
                    onClick={(e) => handleCopyMint(e, activeOpp.solanaMint, activeOpp.symbol)}
                    title="Copy Solana Token-2022 Mint"
                  >
                    {copiedMint === activeOpp.solanaMint ? <Check size={11} /> : <Copy size={11} />}
                    <span>{activeOpp.solanaMint.slice(0, 4)}...{activeOpp.solanaMint.slice(-4)}</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Sizing Slider */}
              <div className={s.sliderSection}>
                <div className={s.sliderLabelRow}>
                  <span className={s.sliderLabel}>Trade Size</span>
                  <span className={s.sliderVal}>{formatCurrency(inspectorSize, 0)}</span>
                </div>
                <input
                  type="range"
                  min={2000}
                  max={100000}
                  step={1000}
                  value={inspectorSize}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setInspectorSize(next);
                    setSelectedSizeUsd(next);
                  }}
                  className={s.sliderInput}
                />
                <div className={s.presetGroup}>
                  {[5000, 10000, 25000, 50000].map((sz) => (
                    <button
                      key={sz}
                      className={`${s.presetBtn} ${inspectorSize === sz ? s.presetBtnActive : ""}`}
                      onClick={() => {
                        setInspectorSize(sz);
                        setSelectedSizeUsd(sz);
                      }}
                    >
                      ${sz / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Authentic Paper Receipt */}
              <div className={s.receipt}>
                <div className={s.rHead}>
                  <b>factor</b>
                  <span>Trade Check</span>
                  <span>{formatCurrency(inspectorSize, 0)}</span>
                </div>

                <div className={s.rLines}>
                  <div className={s.rLine}>
                    <span>Price gap (Gross)</span>
                    <i className={s.rDotLeader} aria-hidden="true" />
                    <span className={s.rLineVal}>{formatBps(activeOpp.grossSpreadBps)}</span>
                  </div>

                  <div className={s.rLine}>
                    <span>
                      Exchange taker fees
                      <small>Both legs combined</small>
                    </span>
                    <i className={s.rDotLeader} aria-hidden="true" />
                    <span className={s.rLineVal}>-{(activeOpp.feesBps).toFixed(1)} bps</span>
                  </div>

                  <div className={s.rLine}>
                    <span>
                      Solana network gas
                      <small>Token-2022 transfer</small>
                    </span>
                    <i className={s.rDotLeader} aria-hidden="true" />
                    <span className={s.rLineVal}>-$0.02</span>
                  </div>

                  <div className={s.rLine}>
                    <span>
                      Inventory rebalance
                      <small>CEX withdrawal fee</small>
                    </span>
                    <i className={s.rDotLeader} aria-hidden="true" />
                    <span className={s.rLineVal}>-$0.05</span>
                  </div>

                  <div className={s.rLine}>
                    <span>
                      Holding carry
                      <small>2 days @ 10% annual cost</small>
                    </span>
                    <i className={s.rDotLeader} aria-hidden="true" />
                    <span className={s.rLineVal}>-{(edgeResult.capitalCarryBps).toFixed(1)} bps</span>
                  </div>
                </div>

                <div className={s.rTotal}>
                  <span>Left over (Net Edge)</span>
                  <b className={edgeResult.clears ? s.edgeGreen : ""}>
                    {formatBps(edgeResult.netEdgeBps)}
                  </b>
                </div>

                <div className={s.rStampArea}>
                  <span
                    className={`${s.stamp} ${
                      edgeResult.clears && activeOpp.gates.marketOpen
                        ? s.stampOk
                        : !activeOpp.gates.marketOpen
                        ? s.stampAmber
                        : s.stampNo
                    }`}
                  >
                    {edgeResult.clears && activeOpp.gates.marketOpen
                      ? "Approved"
                      : !activeOpp.gates.marketOpen
                      ? "Gated"
                      : "Skipped"}
                  </span>
                </div>

                <div className={s.rFoot}>
                  Minimum to clear: 15.0 bps (0.15%)
                </div>
              </div>

              {/* Editorial Decision Verdict (Clean institutional summary, zero generic ticks) */}
              <div
                className={`${s.verdict} ${
                  edgeResult.clears && activeOpp.gates.marketOpen
                    ? s.verdictTake
                    : !activeOpp.gates.marketOpen
                    ? s.verdictGated
                    : s.verdictSkip
                }`}
              >
                <div className={s.verdictHeader}>
                  <span className={s.verdictTitle}>
                    {edgeResult.clears && activeOpp.gates.marketOpen
                      ? "Factor would execute"
                      : !activeOpp.gates.marketOpen
                      ? "Execution gated (Off-hours)"
                      : "Factor would skip"}
                  </span>
                  <span className={s.verdictMeta}>
                    {edgeResult.clears && activeOpp.gates.marketOpen
                      ? "Pre-trade clear"
                      : !activeOpp.gates.marketOpen
                      ? "NYSE session closed"
                      : "Below threshold"}
                  </span>
                </div>
                <p className={s.verdictDesc}>
                  {edgeResult.clears && activeOpp.gates.marketOpen
                    ? `Net residual edge (${formatBps(edgeResult.netEdgeBps)}) clears the 15.0 bps hurdle after all taker fees, gas, and settlement friction.`
                    : !activeOpp.gates.marketOpen
                    ? "NYSE regular session is closed. Factor steps back during off-market hours to avoid overnight dislocation risk."
                    : `Net edge (${formatBps(edgeResult.netEdgeBps)}) fails the 15.0 bps minimum clearance threshold. Execution is suppressed.`}
                </p>
              </div>

              {/* Primary Action Button - Immediately reachable without scrolling */}
              <button
                className={`${s.execBtn} ${!edgeResult.clears || circuitTripped ? s.execBtnDisabled : ""}`}
                disabled={!edgeResult.clears || circuitTripped}
                onClick={() => setIsTradeDrawerOpen(true)}
              >
                <ArrowUpRight size={15} />
                <span>
                  {circuitTripped
                    ? "Execution Halted (Kill Switch)"
                    : `Execute Arbitrage (+${formatCurrency(edgeResult.netDollarProfit)} profit)`}
                </span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Real Live Arbitrage Execution Drawer */}
      {isTradeDrawerOpen && activeOpp && (
        <TradeDrawer
          opp={activeOpp}
          initialSizeUsd={inspectorSize}
          circuitTripped={circuitTripped}
          onTradeExecuted={onTradeExecuted}
          onClose={() => setIsTradeDrawerOpen(false)}
          onToast={onToast}
        />
      )}

      {/* Deep Orderbook Dislocation Modal */}
      {isDislocationOpen && activeOpp && (
        <DislocationModal
          opp={activeOpp}
          onClose={() => setIsDislocationOpen(false)}
          onToast={onToast}
        />
      )}
    </div>
  );
};

