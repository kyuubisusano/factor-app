import React from "react";
import { X, Command } from "lucide-react";
import s from "./HotkeysModal.module.css";

interface HotkeysModalProps {
  onClose: () => void;
}

export const HotkeysModal: React.FC<HotkeysModalProps> = ({ onClose }) => {
  const shortcuts = [
    { key: "1", action: "Switch to Opportunity Matrix view" },
    { key: "2", action: "Switch to Yield Simulator engine" },
    { key: "3", action: "Switch to 6-Gate Safety Breaker room" },
    { key: "/", action: "Focus search box in Matrix" },
    { key: "V", action: "Toggle Table / Card layout mode" },
    { key: "R", action: "Fetch fresh cross-venue quotes" },
    { key: "S", action: "Cycle notional sizing ($1k → $5k → $25k)" },
    { key: "Esc", action: "Close modal / dismiss inspector" },
    { key: "?", action: "Toggle this Keyboard Shortcuts guide" },
  ];

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.header}>
          <div className={s.headerLeft}>
            <div className={s.iconBox}>
              <Command size={18} />
            </div>
            <div>
              <div className={s.title}>Factor Terminal Hotkeys</div>
              <div className={s.subtitle}>High-speed keyboard navigation for quantitative operators</div>
            </div>
          </div>
          <button className={s.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className={s.body}>
          <div className={s.shortcutList}>
            {shortcuts.map((sc) => (
              <div key={sc.key} className={s.row}>
                <span className={s.action}>{sc.action}</span>
                <kbd className={s.key}>{sc.key}</kbd>
              </div>
            ))}
          </div>
        </div>

        <div className={s.footer}>
          <span>Press <kbd className={s.footerKbd}>Esc</kbd> or click outside to dismiss</span>
        </div>
      </div>
    </div>
  );
};
