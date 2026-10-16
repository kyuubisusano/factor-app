import React from "react";
import s from "./Header.module.css";
import type { ProtocolMetrics } from "../../types/market";
import { Logo } from "../Common/Logo";
import { useOperator } from "../../context/OperatorContext";
import { Wallet } from "lucide-react";

interface HeaderProps {
  activeTab: "matrix" | "trades" | "safety" | "simulator";
  setActiveTab: (tab: "matrix" | "trades" | "safety" | "simulator") => void;
  metrics: ProtocolMetrics;
  circuitTripped?: boolean;
  onToggleMarketSession?: () => void;
  scannerStatus?: string;
  tradeCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  metrics,
  circuitTripped = false,
  tradeCount = 0,
}) => {
  const { operator, isConnected, openOperatorModal, openOperatorDrawer } = useOperator();

  return (
    <header className={s.header}>
      <div className={s.headerInner}>
        {/* Brand */}
        <div className={s.brand} onClick={() => setActiveTab("matrix")}>
          <Logo size={22} />
          <span className={s.brandWordmark}>factor</span>
        </div>

        {/* Primary Terminal Navigation */}
        <nav className={s.nav} aria-label="Terminal views">
          <button
            className={`${s.navItem} ${activeTab === "matrix" ? s.active : ""}`}
            onClick={() => setActiveTab("matrix")}
          >
            <span className={s.navLabelFull}>Arbitrage Scanner</span>
            <span className={s.navLabelShort}>Scanner</span>
            {metrics.clearingOpportunitiesCount > 0 && (
              <span className={s.countBadge}>{metrics.clearingOpportunitiesCount}</span>
            )}
          </button>

          <button
            className={`${s.navItem} ${activeTab === "simulator" ? s.active : ""}`}
            onClick={() => setActiveTab("simulator")}
          >
            <span className={s.navLabelFull}>Yield Simulator</span>
            <span className={s.navLabelShort}>Simulator</span>
          </button>

          <button
            className={`${s.navItem} ${activeTab === "trades" ? s.active : ""}`}
            onClick={() => setActiveTab("trades")}
          >
            <span className={s.navLabelFull}>Execution Blotter</span>
            <span className={s.navLabelShort}>Blotter</span>
            {tradeCount > 0 && (
              <span className={s.countBadge}>{tradeCount}</span>
            )}
          </button>
        </nav>

        {/* Right Actions */}
        <div className={s.actions}>
          {circuitTripped && (
            <button
              className={s.circuitStatusBadge}
              onClick={() => setActiveTab("safety")}
              title="Desk execution is paused by safety circuit. Click to review in Risk Controls."
            >
              <span>Execution Paused</span>
            </button>
          )}

          {/* Solana Wallet Access */}
          {isConnected && operator ? (
            <button
              className={s.walletBtn}
              onClick={openOperatorDrawer}
              title="Open Connected Wallet & Risk Limits"
            >
              <Wallet size={12} />
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
              title="Connect Solana Wallet"
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
