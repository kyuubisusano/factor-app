import React, { useState } from "react";
import { X, Check, Copy, Sliders } from "lucide-react";
import s from "./DislocationModal.module.css";
import type { ArbitrageOpportunity } from "../../types/market";
import { calculateEdge, formatBps, formatCurrency } from "../../engine/edge";

interface DislocationModalProps {
  opp: ArbitrageOpportunity;
  onClose: () => void;
  onSendToSimulator?: (opp: ArbitrageOpportunity, customSize?: number) => void;
  onToast?: (toast: { type: "success" | "info" | "warning"; title: string; message?: string }) => void;
}

export const DislocationModal: React.FC<DislocationModalProps> = ({
  opp,
  onClose,
  onSendToSimulator,
  onToast,
}) => {
  const [modalSize, setModalSize] = useState<number>(opp.sizeUsd || 1000);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);

  const dynamicEdge = calculateEdge({
    priceBuy: opp.buyPrice,
    priceSell: opp.sellPrice,
    feeBuyBps: opp.feesBps / 2,
    feeSellBps: opp.feesBps / 2,
    gasBuyUsd: opp.buyVenue === "jupiter" ? 0.02 : 0,
    gasSellUsd: opp.sellVenue === "jupiter" ? 0.02 : 0,
    rebalanceUsd: 0,
    sizeUsd: modalSize,
    annualCapitalCost: 0.10,
    idleDays: 2,
  });

  const handleCopyPayload = () => {
    const payload = {
      underlying: opp.underlying,
      symbol: opp.symbol,
      solanaMint: opp.solanaMint,
      buyVenue: opp.buyVenue,
      sellVenue: opp.sellVenue,
      buyPrice: opp.buyPrice,
      sellPrice: opp.sellPrice,
      sizeUsd: modalSize,
      projectedNetEdgeBps: dynamicEdge.netEdgeBps,
      projectedProfitUsd: dynamicEdge.netDollarProfit,
      timestamp: Date.now(),
    };

    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 1500);

    if (onToast) {
      onToast({
        type: "success",
        title: "Intent JSON Copied",
      });
    }
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={s.header}>
          <div className={s.headerTitleGroup}>
            <span className={s.ticker}>{opp.underlying}</span>
            <span className={s.symbol}>{opp.symbol}</span>
            <span className={s.routeTag}>
              {opp.buyVenue.toUpperCase()} &rarr; {opp.sellVenue.toUpperCase()}
            </span>
          </div>
          <button className={s.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className={s.body}>
          {/* Sizing row */}
          <div className={s.sizeRow}>
            <div className={s.sizeLabel}>
              <span>Order Size:</span>
              <strong className={s.sizeNum}>{formatCurrency(modalSize, 0)}</strong>
            </div>
            <div className={s.sizeChips}>
              {[1000, 5000, 10000, 25000, 50000].map((sz) => (
                <button
                  key={sz}
                  className={`${s.sizeChip} ${modalSize === sz ? s.sizeChipActive : ""}`}
                  onClick={() => setModalSize(sz)}
                >
                  ${sz >= 1000 ? `${sz / 1000}k` : sz}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className={s.metricsGrid}>
            <div className={s.metricBox}>
              <span className={s.mLabel}>Gross Spread</span>
              <span className={`${s.mVal} ${dynamicEdge.grossSpreadBps > 0 ? s.textLime : s.textCoral}`}>
                {formatBps(dynamicEdge.grossSpreadBps)}
              </span>
            </div>
            <div className={s.metricBox}>
              <span className={s.mLabel}>Net Edge</span>
              <span className={`${s.mVal} ${dynamicEdge.clears ? s.textLime : s.textCoral}`}>
                {formatBps(dynamicEdge.netEdgeBps)}
              </span>
            </div>
            <div className={s.metricBox}>
              <span className={s.mLabel}>Profit</span>
              <span className={`${s.mVal} ${dynamicEdge.clears ? s.textLime : s.textCoral}`}>
                {formatCurrency(dynamicEdge.netDollarProfit)}
              </span>
            </div>
            <div className={s.metricBox}>
              <span className={s.mLabel}>Breakeven Rebal</span>
              <span className={s.mVal}>{formatCurrency(dynamicEdge.breakevenRebalanceUsd)}</span>
            </div>
          </div>

          {/* Ledger */}
          <div className={s.section}>
            <div className={s.secTitle}>Cost Breakdown</div>
            <div className={s.ledger}>
              <div className={s.ledgerRow}>
                <span>Gross Revenue</span>
                <span className={s.textLime}>+{(dynamicEdge.grossSpreadBps ?? 0).toFixed(1)} bps</span>
              </div>
              <div className={s.ledgerRow}>
                <span>Venue Fees ({opp.buyVenue} + {opp.sellVenue})</span>
                <span className={s.textCoral}>-{(dynamicEdge.venueFeesBps ?? 8).toFixed(1)} bps</span>
              </div>
              <div className={s.ledgerRow}>
                <span>Solana Priority Gas</span>
                <span className={s.textCoral}>-{(dynamicEdge.gasBps ?? 0.02).toFixed(2)} bps</span>
              </div>
              <div className={s.ledgerRow}>
                <span>Capital Carry (2 days @ 10%)</span>
                <span className={s.textCoral}>-{(dynamicEdge.capitalCarryBps ?? 0.05).toFixed(2)} bps</span>
              </div>
              <div className={`${s.ledgerRow} ${s.ledgerTotal}`}>
                <span>Net Residual Margin</span>
                <span className={dynamicEdge.clears ? s.textLime : s.textCoral}>
                  {formatBps(dynamicEdge.netEdgeBps)} ({formatCurrency(dynamicEdge.netDollarProfit)})
                </span>
              </div>
            </div>
          </div>

          {/* Depth Walk */}
          <div className={s.section}>
            <div className={s.secTitle}>Orderbook Walk</div>
            <div className={s.depthGrid}>
              <div className={s.depthCol}>
                <div className={s.depthHead}>
                  <span>{opp.buyVenue.toUpperCase()} Ask</span>
                  <span className={s.mono}>{formatCurrency(opp.buyPrice)}</span>
                </div>
                <div className={s.depthLevels}>
                  <div className={s.depthLevel}>
                    <div className={s.fillAsk} style={{ width: modalSize >= 1000 ? "100%" : "50%" }} />
                    <span className={s.depthText}>L1: $1k @ {formatCurrency(opp.buyPrice)}</span>
                  </div>
                  <div className={s.depthLevel}>
                    <div className={s.fillAsk} style={{ width: modalSize >= 5000 ? "75%" : "15%" }} />
                    <span className={s.depthText}>L2: $5k @ {formatCurrency(opp.buyPrice * 1.0003)}</span>
                  </div>
                </div>
              </div>

              <div className={s.depthCol}>
                <div className={s.depthHead}>
                  <span>{opp.sellVenue.toUpperCase()} Bid</span>
                  <span className={s.mono}>{formatCurrency(opp.sellPrice)}</span>
                </div>
                <div className={s.depthLevels}>
                  <div className={s.depthLevel}>
                    <div className={s.fillBid} style={{ width: modalSize >= 1000 ? "100%" : "50%" }} />
                    <span className={s.depthText}>L1: $1k @ {formatCurrency(opp.sellPrice)}</span>
                  </div>
                  <div className={s.depthLevel}>
                    <div className={s.fillBid} style={{ width: modalSize >= 5000 ? "75%" : "15%" }} />
                    <span className={s.depthText}>L2: $5k @ {formatCurrency(opp.sellPrice * 0.9997)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6 Gate Verification */}
          <div className={s.section}>
            <div className={s.secTitle}>Verification Gates</div>
            <div className={s.gateList}>
              <div className={s.gateItem}>
                <span className={dynamicEdge.clears ? s.tagPass : s.tagFail}>G1</span>
                <span className={s.gateName}>Net Edge &ge; 15 bps</span>
                <span className={s.gateStatus}>{(dynamicEdge.netEdgeBps ?? 0).toFixed(1)} bps</span>
              </div>
              <div className={s.gateItem}>
                <span className={opp.gates?.referenceInBand ? s.tagPass : s.tagFail}>G2</span>
                <span className={s.gateName}>3-Source Ref Quorum</span>
                <span className={s.gateStatus}>
                  &Delta; {(typeof opp.refDeviationBps === "number" ? opp.refDeviationBps : ((opp as any).refSpreadBps ?? 2.1)).toFixed(1)} bps
                </span>
              </div>
              <div className={s.gateItem}>
                <span className={opp.gates?.marketOpen ? s.tagPass : s.tagAmber}>G3</span>
                <span className={s.gateName}>NYSE Regular Session</span>
                <span className={s.gateStatus}>{opp.marketMode || (opp.gates?.marketOpen ? "OPEN" : "CLOSED")}</span>
              </div>
              <div className={s.gateItem}>
                <span className={opp.gates?.rebalanceKnown ? s.tagPass : s.tagFail}>G4</span>
                <span className={s.gateName}>Rebalance Verification</span>
                <span className={s.gateStatus}>{opp.gates?.rebalanceKnown ? "Verified" : "Unverified"}</span>
              </div>
              <div className={s.gateItem}>
                <span className={opp.gates?.noHold ? s.tagPass : s.tagFail}>G5</span>
                <span className={s.gateName}>Multiplier Hold Window</span>
                <span className={s.gateStatus}>{opp.gates?.noHold ? "Clear" : "Hold"}</span>
              </div>
              <div className={s.gateItem}>
                <span className={opp.gates?.circuitArmed ? s.tagPass : s.tagFail}>G6</span>
                <span className={s.gateName}>Safety Circuit State</span>
                <span className={s.gateStatus}>{opp.gates?.circuitArmed ? "Armed" : "Tripped"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={s.footer}>
          <div className={s.footerLeft}>
            <span className={s.verdictLabel}>Status:</span>
            <span className={opp.tradable && dynamicEdge.clears ? s.textLime : dynamicEdge.clears ? s.textLime : s.textCoral}>
              {opp.tradable && dynamicEdge.clears ? "Tradable" : dynamicEdge.clears ? "Clears (Gated)" : "Sub-threshold"}
            </span>
          </div>
          <div className={s.footerRight}>
            <button className={s.btnSubtle} onClick={handleCopyPayload}>
              {copiedPayload ? <Check size={12} className={s.textLime} /> : <Copy size={12} />}
              <span>{copiedPayload ? "Copied" : "Copy JSON"}</span>
            </button>
            {onSendToSimulator && (
              <button
                className={s.btnPrimary}
                onClick={() => {
                  onSendToSimulator(opp, modalSize);
                  onClose();
                }}
              >
                <Sliders size={12} />
                <span>Simulate</span>
              </button>
            )}
            <button className={s.btnSubtle} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
