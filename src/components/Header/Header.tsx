import React from "react";
import s from "./Header.module.css";
import type { ProtocolMetrics } from "../../types/market";
import { Logo } from "../Common/Logo";
import { useOperator } from "../../context/OperatorContext";
import type { ConnectionStatus } from "../../hooks/useLiveScanner";
import { Wallet } from "lucide-react";

interface HeaderProps {
  activeTab: "matrix" | "safety" | "simulator";
  setActiveTab: (tab: "matrix" | "safety" | "simulator") => void;
  metrics: ProtocolMetrics;
  circuitTripped?: boolean;
  onToggleMarketSession?: () => void;
  scannerStatus?: ConnectionStatus;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  metrics,
  scannerStatus = "connected",
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

        {/* Navigation Tabs */}
        <nav className={s.nav} aria-label="Terminal views">
          <button
            className={`${s.navItem} ${activeTab === "matrix" ? s.active : ""}`}
            onClick={() => setActiveTab("matrix")}
          >
            <span>Opportunities</span>
            {metrics.clearingOpportunitiesCount > 0 && (
              <span className={s.navCount}>({metrics.clearingOpportunitiesCount})</span>
            )}
          </button>
          <button
            className={`${s.navItem} ${activeTab === "safety" ? s.active : ""}`}
            onClick={() => setActiveTab("safety")}
          >
            <span>Risk Controls</span>
          </button>
          <button
            className={`${s.navItem} ${activeTab === "simulator" ? s.active : ""}`}
            onClick={() => setActiveTab("simulator")}
          >
            <span>Yield Modeler</span>
          </button>
        </nav>

        {/* Header Right Actions */}
        <div className={s.actions}>
          <div className={s.feedMeta}>
            <span className={s.feedStatus}>
              <span>{scannerStatus === "connected" ? "22 pairs synced" : "Reconnecting feeds..."}</span>
            </span>
          </div>

          <div className={s.actionSep} />

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

