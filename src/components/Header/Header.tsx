import React from "react";
import s from "./Header.module.css";
import type { ProtocolMetrics } from "../../types/market";
import { Logo } from "../Common/Logo";
import { useOperator } from "../../context/OperatorContext";
import type { ConnectionStatus } from "../../hooks/useLiveScanner";
import { Wallet, Sparkles } from "lucide-react";

interface HeaderProps {
  activeTab: "matrix" | "trades" | "safety" | "simulator";
  setActiveTab: (tab: "matrix" | "trades" | "safety" | "simulator") => void;
  metrics: ProtocolMetrics;
  circuitTripped?: boolean;
  onToggleMarketSession?: () => void;
  scannerStatus?: ConnectionStatus;
  tradeCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  metrics,
  circuitTripped = false,
  scannerStatus = "connected",
  tradeCount = 0,
}) => {
  const { operator, isConnected, openOperatorModal, openOperatorDrawer } = useOperator();

  return (
    <header className={s.header}>
      <div className={s.headerInner}>
        {/* Brand: Exact landing page logo & lowercase wordmark */}
        <div className={s.brand} onClick={() => setActiveTab("matrix")}>
          <Logo size={22} />
          <span className={s.brandWordmark}>factor</span>
        </div>

        {/* Navigation Tabs - Institutional Trading Hierarchy */}
        <nav className={s.nav} aria-label="Terminal views">
          <button
            className={`${s.navItem} ${activeTab === "matrix" ? s.active : ""}`}
            onClick={() => setActiveTab("matrix")}
          >
            <span>Arbitrage Scanner</span>
            {metrics.clearingOpportunitiesCount > 0 && (
              <span className={s.navCount}>{metrics.clearingOpportunitiesCount}</span>
            )}
          </button>

          {/* Featured Proprietary Value-Prop */}
          <button
            className={`${s.navItem} ${s.navItemFeatured} ${activeTab === "simulator" ? s.active : ""}`}
            onClick={() => setActiveTab("simulator")}
            title="Institutional Yield Simulator: Model net arbitrage returns across taker fees, gas, and carrying capital"
          >
            <Sparkles size={12} className={s.sparkleIcon} />
            <span>Yield Simulator</span>
            <span className={s.featuredTag}>FEATURED</span>
          </button>

          <button
            className={`${s.navItem} ${activeTab === "trades" ? s.active : ""}`}
            onClick={() => setActiveTab("trades")}
          >
            <span>Execution Blotter</span>
            {tradeCount > 0 && (
              <span className={s.navCountTrades}>{tradeCount}</span>
            )}
          </button>
        </nav>

        {/* Header Right Actions */}
        <div className={s.actions}>
          {/* Institutional Market Telemetry */}
          <div
            className={s.marketStatus}
            title="Institutional pricing telemetry synced across NYSE/NASDAQ equities and Solana Jupiter DEX"
          >
            <span className={scannerStatus === "connected" ? s.pulseDotGreen : s.pulseDotAmber} />
            <span className={s.marketStatusText}>
              {scannerStatus === "connected" ? "US Equities & Solana Active" : "Reconnecting Feeds..."}
            </span>
          </div>

          <div className={s.actionSep} />

          {/* Subtle Safety Indicator (Visible only if desk execution is paused, linking to Risk Controls) */}
          {circuitTripped && (
            <>
              <button
                className={s.circuitStatusBadge}
                onClick={() => setActiveTab("safety")}
                title="Desk execution is paused by safety circuit. Click to review in Risk Controls."
              >
                <span className={s.statusDotAmber} />
                <span>Execution Paused</span>
              </button>
              <div className={s.actionSep} />
            </>
          )}

          {/* Solana Wallet Access */}
          {isConnected && operator ? (
            <button
              className={s.walletBtn}
              onClick={openOperatorDrawer}
              title="Open Connected Wallet & Risk Limits"
            >
              <Wallet size={12} color="var(--lime)" />
              <span className={s.walletAddress}>
                {operator.address && operator.address.length > 12
                  ? `${operator.address.slice(0, 4)}...${operator.address.slice(-4)}`
                  : operator.address || operator.deskCode}
              </span>
              {operator.isSimulated && <span className={s.demoBadge}>DEMO</span>}
            </button>
          ) : (
            <button
              className={s.connectWalletBtn}
              onClick={openOperatorModal}
              title="Connect Solana Wallet (Phantom, Solflare, Backpack)"
            >
              <Wallet size={13} />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
