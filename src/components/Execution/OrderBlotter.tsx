import React from "react";
import { CheckCircle2, Loader2, Circle, ExternalLink, AlertTriangle } from "lucide-react";
import s from "./OrderBlotter.module.css";

export type ExecutionStage =
  | "IDLE"
  | "CHECKING_RISK"
  | "PROMPTING_WALLET"
  | "BROADCASTING_SOLANA"
  | "DISPATCHING_CEX"
  | "CONFIRMED"
  | "UNWOUND"
  | "FAILED";

interface OrderBlotterProps {
  stage: ExecutionStage;
  solanaTxHash?: string;
  cexOrderId?: string;
  netProfitUsd?: number;
  netBps?: number;
  error?: string;
  unwindNotice?: string;
}

export const OrderBlotter: React.FC<OrderBlotterProps> = ({
  stage,
  solanaTxHash,
  cexOrderId,
  netProfitUsd,
  netBps,
  error,
  unwindNotice,
}) => {
  if (stage === "IDLE") return null;

  const isPast = (target: ExecutionStage) => {
    const order: ExecutionStage[] = [
      "IDLE",
      "CHECKING_RISK",
      "PROMPTING_WALLET",
      "BROADCASTING_SOLANA",
      "DISPATCHING_CEX",
      "CONFIRMED",
    ];
    const currIdx = order.indexOf(stage);
    const targetIdx = order.indexOf(target);
    return currIdx > targetIdx || stage === "CONFIRMED";
  };

  const isCurrent = (target: ExecutionStage) => stage === target;

  return (
    <div className={s.blotterContainer}>
      <div className={s.blotterHeader}>
        <span>Execution Blotter</span>
        {stage !== "CONFIRMED" && stage !== "FAILED" && stage !== "UNWOUND" && (
          <span className={s.iconActive}><Loader2 size={14} /></span>
        )}
      </div>

      <div className={s.stageList}>
        {/* Step 1 */}
        <div className={s.stageItem}>
          <div className={`${s.stageIcon} ${isPast("CHECKING_RISK") ? s.iconDone : isCurrent("CHECKING_RISK") ? s.iconActive : s.iconPending}`}>
            {isPast("CHECKING_RISK") ? <CheckCircle2 size={12} /> : isCurrent("CHECKING_RISK") ? <Loader2 size={12} /> : <Circle size={10} />}
          </div>
          <span className={`${s.stageText} ${isCurrent("CHECKING_RISK") ? s.stageActiveText : ""}`}>
            Pre-trade Risk Gate & Inventory Verification
          </span>
        </div>

        {/* Step 2 */}
        <div className={s.stageItem}>
          <div className={`${s.stageIcon} ${isPast("PROMPTING_WALLET") ? s.iconDone : isCurrent("PROMPTING_WALLET") ? s.iconActive : s.iconPending}`}>
            {isPast("PROMPTING_WALLET") ? <CheckCircle2 size={12} /> : isCurrent("PROMPTING_WALLET") ? <Loader2 size={12} /> : <Circle size={10} />}
          </div>
          <span className={`${s.stageText} ${isCurrent("PROMPTING_WALLET") ? s.stageActiveText : ""}`}>
            Sign Transaction in Connected Wallet
          </span>
        </div>

        {/* Step 3 */}
        <div className={s.stageItem}>
          <div className={`${s.stageIcon} ${isPast("BROADCASTING_SOLANA") ? s.iconDone : isCurrent("BROADCASTING_SOLANA") ? s.iconActive : s.iconPending}`}>
            {isPast("BROADCASTING_SOLANA") ? <CheckCircle2 size={12} /> : isCurrent("BROADCASTING_SOLANA") ? <Loader2 size={12} /> : <Circle size={10} />}
          </div>
          <div className={s.stageText}>
            <span className={isCurrent("BROADCASTING_SOLANA") ? s.stageActiveText : ""}>
              Solana Swap Broadcast (Jupiter + Jito MEV Bundle)
            </span>
            {solanaTxHash && (
              <div>
                <a
                  href={`https://solscan.io/tx/${solanaTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className={s.txLink}
                >
                  {solanaTxHash.slice(0, 8)}...{solanaTxHash.slice(-6)}
                  <ExternalLink size={10} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Step 4 */}
        <div className={s.stageItem}>
          <div className={`${s.stageIcon} ${isPast("DISPATCHING_CEX") ? s.iconDone : isCurrent("DISPATCHING_CEX") ? s.iconActive : s.iconPending}`}>
            {isPast("DISPATCHING_CEX") ? <CheckCircle2 size={12} /> : isCurrent("DISPATCHING_CEX") ? <Loader2 size={12} /> : <Circle size={10} />}
          </div>
          <div className={s.stageText}>
            <span className={isCurrent("DISPATCHING_CEX") ? s.stageActiveText : ""}>
              CEX Spot Leg (Immediate-Or-Cancel Market Order)
            </span>
            {cexOrderId && (
              <span className={s.txLink}>Order: {cexOrderId}</span>
            )}
          </div>
        </div>
      </div>

      {stage === "CONFIRMED" && (
        <div className={s.successBanner}>
          <div className={s.successTitle}>
            ✓ Arbitrage Settled & Locked
          </div>
          <div className={s.successDesc}>
            Net Profit: +${(netProfitUsd || 0).toFixed(2)} (+{(netBps || 0).toFixed(1)} bps) after all venue taker fees and Solana priority gas.
          </div>
        </div>
      )}

      {stage === "UNWOUND" && (
        <div className={s.successBanner} style={{ borderColor: "#f59e0b", background: "rgba(245, 158, 11, 0.1)" }}>
          <div className={s.successTitle} style={{ color: "#f59e0b", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} /> 2-Block Safety Unwind Executed
          </div>
          <div className={s.successDesc} style={{ color: "#fde68a" }}>
            {unwindNotice || "One leg reverted; emergency unwind completed to neutralize naked exposure."}
          </div>
        </div>
      )}

      {stage === "FAILED" && (
        <div className={s.successBanner} style={{ borderColor: "#ef4444", background: "rgba(239, 68, 68, 0.1)" }}>
          <div className={s.successTitle} style={{ color: "#ef4444" }}>
            Execution Failed
          </div>
          <div className={s.successDesc} style={{ color: "#fca5a5" }}>
            {error || "Order rejected by risk gate or execution router."}
          </div>
        </div>
      )}
    </div>
  );
};
