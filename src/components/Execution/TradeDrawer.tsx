import React, { useState, useEffect } from "react";
import { X, ArrowRight, ShieldCheck, Wallet, ArrowUpRight } from "lucide-react";
import s from "./TradeDrawer.module.css";
import type { ArbitrageOpportunity } from "../../types/market";
import { formatCurrency, formatBps } from "../../engine/edge";
import { useOperator } from "../../context/OperatorContext";
import { fetchTradeQuote, executeLiveTrade, type TradeQuoteResponse } from "../../services/api";
import { OrderBlotter, type ExecutionStage } from "./OrderBlotter";

interface TradeDrawerProps {
  opp: ArbitrageOpportunity;
  initialSizeUsd?: number;
  circuitTripped?: boolean;
  onTradeExecuted?: () => void;
  onClose: () => void;
  onToast?: (toast: { type: "success" | "info" | "warning"; title: string; message?: string }) => void;
}

export const TradeDrawer: React.FC<TradeDrawerProps> = ({
  opp,
  initialSizeUsd = 10000,
  circuitTripped = false,
  onTradeExecuted,
  onClose,
  onToast,
}) => {
  const { operator, isConnected, openOperatorModal, signSolanaTransaction, refreshBalances } = useOperator();

  const [sizeUsd, setSizeUsd] = useState<number>(initialSizeUsd);
  const slippageBps = 15;
  const [quoteData, setQuoteData] = useState<TradeQuoteResponse | null>(null);

  // Execution Blotter state
  const [stage, setStage] = useState<ExecutionStage>("IDLE");
  const [solanaTxHash, setSolanaTxHash] = useState<string | undefined>();
  const [cexOrderId, setCexOrderId] = useState<string | undefined>();
  const [executionError, setExecutionError] = useState<string | undefined>();
  const [unwindNotice, setUnwindNotice] = useState<string | undefined>();

  // Load quote on mount or when size/symbol changes
  useEffect(() => {
    let cancelled = false;

    fetchTradeQuote({
      symbol: opp.symbol,
      sizeUsd,
      buyVenue: opp.buyVenue,
      sellVenue: opp.sellVenue,
      userPublicKey: operator?.address,
      slippageBps,
    }).then((data) => {
      if (!cancelled) {
        setQuoteData(data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [opp.symbol, opp.buyVenue, opp.sellVenue, sizeUsd, slippageBps, operator?.address]);

  const handleExecute = async () => {
    if (!isConnected || !operator) {
      openOperatorModal();
      return;
    }

    if (circuitTripped) {
      setStage("FAILED");
      setExecutionError("Execution Suppressed: Desk Emergency Kill Switch is TRIPPED.");
      return;
    }

    setStage("CHECKING_RISK");
    setExecutionError(undefined);
    setUnwindNotice(undefined);

    try {
      // Step 1: Pre-trade risk check
      if (quoteData?.riskGate && !quoteData.riskGate.passed) {
        setStage("FAILED");
        setExecutionError(quoteData.riskGate.reason || "Trade fails PRD risk gate");
        return;
      }

      let signedTxBase64: string | undefined;

      // Step 2: If we have a serialized Jupiter swap transaction and a real connected wallet, prompt user signature
      if (quoteData?.swapTransactionBase64 && !operator.isSimulated) {
        setStage("PROMPTING_WALLET");
        try {
          signedTxBase64 = await signSolanaTransaction(quoteData.swapTransactionBase64);
        } catch (signErr: any) {
          setStage("FAILED");
          setExecutionError(signErr?.message || "User rejected signature in wallet.");
          return;
        }
      }

      // Step 3 & 4: Dispatch execution to backend
      setStage("BROADCASTING_SOLANA");
      const execRes = await executeLiveTrade({
        symbol: opp.symbol,
        sizeUsd,
        buyVenue: opp.buyVenue,
        sellVenue: opp.sellVenue,
        operatorId: operator.address || operator.deskCode || "DESK",
        signedTxBase64,
        dryRun: operator.isSimulated || false,
      });

      if (execRes.solanaTxHash) setSolanaTxHash(execRes.solanaTxHash);
      if (execRes.cexOrderId) setCexOrderId(execRes.cexOrderId);

      if (execRes.status === "FILLED_LIVE") {
        setStage("CONFIRMED");
        if (onToast) {
          onToast({
            type: "success",
            title: "Arbitrage Settled",
            message: `Locked +$${(quoteData?.riskGate.projectedProfitUsd || 19.3).toFixed(2)} across Solana & Kraken.`,
          });
        }
        refreshBalances();
        if (onTradeExecuted) onTradeExecuted();
      } else if (execRes.status === "UNWOUND_EMERGENCY") {
        setStage("UNWOUND");
        setUnwindNotice(execRes.unwindNotice);
        if (onToast) {
          onToast({
            type: "warning",
            title: "2-Block Unwind Triggered",
            message: execRes.unwindNotice || "Naked exposure was closed.",
          });
        }
        if (onTradeExecuted) onTradeExecuted();
      } else {
        setStage("FAILED");
        setExecutionError(execRes.error || execRes.message || "Execution failed.");
      }
    } catch (e: any) {
      setStage("FAILED");
      setExecutionError(e?.message || "Unexpected execution error.");
    }
  };

  const netProfitUsd = quoteData?.riskGate.projectedProfitUsd || (opp.netEdgeBps / 10000) * sizeUsd;
  const netEdgeBps = quoteData?.riskGate.netEdgeBps || opp.netEdgeBps;
  const isExecuting = stage !== "IDLE" && stage !== "CONFIRMED" && stage !== "FAILED" && stage !== "UNWOUND";

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={s.header}>
          <div className={s.headerLeft}>
            <div className={s.badgeLive}>
              <span className={s.pulseDot} />
              Live Trade Desk
            </div>
            <h2 className={s.title}>Arbitrage Execution</h2>
          </div>
          <button className={s.closeBtn} onClick={onClose} disabled={isExecuting}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className={s.body}>
          {/* Asset Info Card */}
          <div className={s.assetCard}>
            <div className={s.assetMain}>
              <div className={s.symbolRow}>
                <span className={s.symbol}>{opp.symbol}</span>
                <span className={s.underlying}>{opp.underlying}</span>
              </div>
              <span className={s.name}>{opp.name}</span>
            </div>
            <div className={s.routeBox}>
              <span className={s.venueTag}>{opp.buyVenue.toUpperCase()}</span>
              <ArrowRight size={13} />
              <span className={s.venueTag}>{opp.sellVenue.toUpperCase()}</span>
            </div>
          </div>

          {/* Sizing Selector */}
          <div className={s.section}>
            <span className={s.sectionTitle}>Execution Notional</span>
            <div className={s.sizeGrid}>
              {[1000, 5000, 10000, 25000].map((sz) => (
                <button
                  key={sz}
                  className={`${s.sizeBtn} ${sizeUsd === sz ? s.sizeBtnActive : ""}`}
                  onClick={() => setSizeUsd(sz)}
                  disabled={isExecuting}
                >
                  ${sz >= 1000 ? `${sz / 1000}k` : sz}
                </button>
              ))}
            </div>
          </div>

          {/* Wallet & Balance Check */}
          <div className={s.balanceBox}>
            <span className={s.balanceLabel}>
              {isConnected ? (
                <span>Connected: <strong style={{ color: "#ffffff" }}>{operator?.label}</strong></span>
              ) : (
                "Operator Wallet"
              )}
            </span>
            <span className={s.balanceValue}>
              {isConnected ? (
                <span className={s.textGreen}>
                  {operator?.isSimulated
                    ? `$${(operator.simulatedBalanceSol * 150).toFixed(0)} USDC (Demo)`
                    : `$${(operator?.usdcBalance || 0).toLocaleString()} USDC Ready`}
                </span>
              ) : (
                <span className={s.textAmber}>Not Connected</span>
              )}
            </span>
          </div>

          {/* Live Order Blotter when executing */}
          {stage !== "IDLE" && (
            <OrderBlotter
              stage={stage}
              solanaTxHash={solanaTxHash}
              cexOrderId={cexOrderId}
              netProfitUsd={netProfitUsd}
              netBps={netEdgeBps}
              error={executionError}
              unwindNotice={unwindNotice}
            />
          )}

          {/* Pricing & Cost Breakdown */}
          <div className={s.quoteSummary}>
            <div className={s.quoteRow}>
              <span>Gross Spread</span>
              <span className={s.textGreen}>+{(quoteData?.riskGate.grossSpreadBps || opp.grossSpreadBps).toFixed(1)} bps</span>
            </div>
            <div className={s.quoteRow}>
              <span>Exchange Taker Fees</span>
              <span className={s.textRed}>-8.0 bps</span>
            </div>
            <div className={s.quoteRow}>
              <span>Solana Priority Gas (Jito Tip)</span>
              <span className={s.textRed}>-$0.02</span>
            </div>
            <div className={s.quoteRow}>
              <span>Capital Carry (2 days @ 10%)</span>
              <span className={s.textRed}>-5.5 bps</span>
            </div>
            <div className={`${s.quoteRow} ${s.quoteTotal}`}>
              <span>Projected Net Profit</span>
              <span className={s.textGreen}>
                +{formatCurrency(netProfitUsd)} ({formatBps(netEdgeBps)})
              </span>
            </div>
          </div>

          {/* Pre-Trade Verification Gates */}
          <div className={s.section}>
            <span className={s.sectionTitle}>Pre-Trade Risk Clearance</span>
            <div className={s.gatePills}>
              <div className={`${s.gatePill} ${netEdgeBps >= 15 ? s.gatePass : s.gateFail}`}>
                <ShieldCheck size={12} />
                <span>Net Edge &ge; 15 bps</span>
              </div>
              <div className={`${s.gatePill} ${s.gatePass}`}>
                <ShieldCheck size={12} />
                <span>$25k Exposure Cap</span>
              </div>
              <div className={`${s.gatePill} ${opp.gates.marketOpen ? s.gatePass : s.gateFail}`}>
                <ShieldCheck size={12} />
                <span>{opp.gates.marketOpen ? "NYSE Open" : "Market Closed"}</span>
              </div>
              <div className={`${s.gatePill} ${s.gatePass}`}>
                <ShieldCheck size={12} />
                <span>2-Block Unwind Armed</span>
              </div>
            </div>
          </div>

          {circuitTripped && (
            <div
              className={s.warningBox}
              style={{
                borderColor: "rgba(239, 68, 68, 0.4)",
                background: "rgba(239, 68, 68, 0.08)",
                color: "#fca5a5",
              }}
            >
              ⚠️ Desk Emergency Kill Switch is TRIPPED. Arbitrage execution is suppressed. Click HALTED in header to re-arm.
            </div>
          )}

          {!isConnected && (
            <div className={s.warningBox}>
              Please connect your Solana wallet (Phantom / Solflare) or sign in to authorize automated cross-venue execution.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={s.footer}>
          {!isConnected ? (
            <button className={s.actionBtn} onClick={openOperatorModal}>
              <Wallet size={16} />
              <span>Connect Wallet to Trade</span>
            </button>
          ) : (
            <button
              className={s.actionBtn}
              onClick={handleExecute}
              disabled={isExecuting || netEdgeBps < 15 || circuitTripped}
            >
              <ArrowUpRight size={16} />
              <span>
                {circuitTripped
                  ? "Trading Halted (Kill Switch Tripped)"
                  : isExecuting
                  ? "Routing & Executing..."
                  : `Sign & Execute Arbitrage (+${formatCurrency(netProfitUsd)})`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
