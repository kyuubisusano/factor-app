import React from "react";
import s from "./ExecutionTicketModal.module.css";
import type { ExecutionRecord } from "../../services/api";

interface ExecutionTicketModalProps {
  ticket: ExecutionRecord | null;
  onClose: () => void;
}

export const ExecutionTicketModal: React.FC<ExecutionTicketModalProps> = ({ ticket, onClose }) => {
  if (!ticket) return null;

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Ticket Header */}
        <div className={s.ticketHead}>
          <span className={s.brand}>factor</span>
          <span className={s.ticketId}>{ticket.id}</span>
        </div>

        {/* Lines */}
        <div className={s.lines}>
          <div className={s.line}>
            <span className={s.lineLabel}>Asset</span>
            <span className={s.lineVal}>{ticket.symbol}</span>
          </div>
          <div className={s.line}>
            <span className={s.lineLabel}>Route</span>
            <span className={s.lineVal}>{ticket.buyVenue.toUpperCase()} &rarr; {ticket.sellVenue.toUpperCase()}</span>
          </div>
          <div className={s.line}>
            <span className={s.lineLabel}>Notional Size</span>
            <span className={s.lineVal}>${ticket.sizeUsd.toLocaleString()}</span>
          </div>
          <div className={s.line}>
            <span className={s.lineLabel}>Buy Price</span>
            <span className={s.lineVal}>${ticket.buyPrice.toFixed(2)}</span>
          </div>
          <div className={s.line}>
            <span className={s.lineLabel}>Sell Price</span>
            <span className={s.lineVal}>${ticket.sellPrice.toFixed(2)}</span>
          </div>
          <div className={s.line}>
            <span className={s.lineLabel}>Gross Spread</span>
            <span className={s.lineVal}>+{ticket.grossBps.toFixed(1)} bps</span>
          </div>
          <div className={s.line}>
            <span className={s.lineLabel}>All Frictions Deducted</span>
            <span className={s.lineVal}>&minus;{(ticket.grossBps - ticket.netBps).toFixed(1)} bps</span>
          </div>
          <div className={s.line}>
            <span className={s.lineLabel}>Operator</span>
            <span className={s.lineVal}>{ticket.operatorId}</span>
          </div>
        </div>

        {/* Total Settled Profit */}
        <div className={s.totalRow}>
          <span>Net Settled Edge</span>
          <span className={s.totalProfit}>
            +{ticket.netBps.toFixed(1)} bps (+${ticket.dollarProfit.toFixed(2)})
          </span>
        </div>

        {/* Rubber Stamp */}
        <div className={s.stampArea}>
          <span className={s.stamp}>FILLED</span>
        </div>

        <div className={s.foot}>
          Logged to SQLite &bull; Solana Token-2022 Verified
        </div>

        <button className={s.dismissBtn} onClick={onClose}>
          Close Ticket
        </button>
      </div>
    </div>
  );
};
