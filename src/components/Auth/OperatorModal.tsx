import React, { useState, useEffect } from "react";
import { X, ShieldCheck, AlertCircle, ExternalLink, RefreshCw, LogOut } from "lucide-react";
import s from "./OperatorModal.module.css";
import { useOperator, WALLET_DOWNLOAD_URLS, getInstalledProvider } from "../../context/OperatorContext";

export const OperatorModal: React.FC = () => {
  const {
    operator,
    isOperatorModalOpen,
    closeOperatorModal,
    connectWallet,
    logout,
  } = useOperator();

  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [detectedWallets, setDetectedWallets] = useState<{
    phantom: boolean;
    solflare: boolean;
    backpack: boolean;
  }>({
    phantom: false,
    solflare: false,
    backpack: false,
  });

  const [alertNotice, setAlertNotice] = useState<{
    type: "missing" | "error";
    walletId?: "phantom" | "solflare" | "backpack";
    walletName?: string;
    message: string;
    installUrl?: string;
  } | null>(null);

  // Detect installed extensions on open and after slight injection delay
  useEffect(() => {
    if (!isOperatorModalOpen) {
      setAlertNotice(null);
      setConnectingWallet(null);
      return;
    }

    const detect = () => {
      setDetectedWallets({
        phantom: !!getInstalledProvider("phantom"),
        solflare: !!getInstalledProvider("solflare"),
        backpack: !!getInstalledProvider("backpack"),
      });
    };

    detect();
    const t = setTimeout(detect, 400);
    return () => clearTimeout(t);
  }, [isOperatorModalOpen]);

  if (!isOperatorModalOpen) return null;

  const handleConnectReal = async (walletType: "phantom" | "solflare" | "backpack", walletName: string) => {
    setAlertNotice(null);
    setConnectingWallet(walletType);

    try {
      const res = await connectWallet(walletType);
      if (!res.success) {
        if (res.notInstalled) {
          setAlertNotice({
            type: "missing",
            walletId: walletType,
            walletName,
            message: `${walletName} extension was not found in this browser window.`,
            installUrl: res.installUrl || WALLET_DOWNLOAD_URLS[walletType],
          });
        } else {
          setAlertNotice({
            type: "error",
            message: res.error || `Failed to connect to ${walletName}.`,
          });
        }
      }
    } catch (e: any) {
      setAlertNotice({
        type: "error",
        message: e?.message || `Unexpected error connecting to ${walletName}.`,
      });
    } finally {
      setConnectingWallet(null);
    }
  };


  const wallets = [
    {
      id: "phantom" as const,
      name: "Phantom",
      badge: "P",
      sub: "Solana native & Token-2022 extensions",
    },
    {
      id: "solflare" as const,
      name: "Solflare",
      badge: "S",
      sub: "Institutional vault & Ledger hardware",
    },
    {
      id: "backpack" as const,
      name: "Backpack",
      badge: "B",
      sub: "xStocks & tokenized equities native",
    },
  ];

  return (
    <div className={s.backdrop} onClick={closeOperatorModal}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={s.header}>
          <div className={s.titleGroup}>
            <h2>Connect Solana Wallet</h2>
            <p>Verify Token-2022 cross-venue settlement identity</p>
          </div>
          <button className={s.closeBtn} onClick={closeOperatorModal} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className={s.body}>
          {/* Active Session Notice with Quick Disconnect */}
          {operator && (
            <div className={s.activeSessionBox}>
              <div className={s.activeSessionLeft}>
                <span className={s.activeSessionLabel}>CURRENT SESSION</span>
                <div className={s.activeSessionAddress}>
                  <span>{operator.label}</span>
                  {operator.isSimulated && <span className={s.demoPill}>DEMO</span>}
                </div>
              </div>
              <button
                className={s.disconnectMiniBtn}
                onClick={logout}
                title="Disconnect this wallet session"
              >
                <LogOut size={12} />
                <span>Disconnect</span>
              </button>
            </div>
          )}

          {/* Missing Extension or Error Alert */}
          {alertNotice && (
            <div
              className={`${s.alertBox} ${
                alertNotice.type === "missing" ? s.alertMissing : s.alertError
              }`}
            >
              <div className={s.alertHead}>
                <AlertCircle size={14} className={s.alertIcon} />
                <span className={s.alertTitle}>
                  {alertNotice.type === "missing"
                    ? `${alertNotice.walletName} Not Detected`
                    : "Connection Error"}
                </span>
              </div>
              <p className={s.alertText}>{alertNotice.message}</p>
              {alertNotice.type === "missing" && (
                <div className={s.alertActions}>
                  {alertNotice.installUrl && (
                    <a
                      href={alertNotice.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.installExtBtn}
                    >
                      <span>Install {alertNotice.walletName} Extension</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Wallets List */}
          <div className={s.walletList}>
            {wallets.map((w) => {
              const isDetected = detectedWallets[w.id];
              const isConnecting = connectingWallet === w.id;

              return (
                <button
                  key={w.id}
                  className={`${s.walletItem} ${isConnecting ? s.walletItemConnecting : ""}`}
                  onClick={() => handleConnectReal(w.id, w.name)}
                  disabled={connectingWallet !== null}
                >
                  <div className={s.walletInfo}>
                    <div className={s.walletIconBox}>{w.badge}</div>
                    <div>
                      <div className={s.walletNameRow}>
                        <span className={s.walletName}>{w.name}</span>
                        {isDetected ? (
                          <span className={s.detectedBadge}>Detected</span>
                        ) : (
                          <span className={s.notDetectedBadge}>Not Installed</span>
                        )}
                      </div>
                      <div className={s.walletSub}>{w.sub}</div>
                    </div>
                  </div>
                  <div className={s.connectTag}>
                    {isConnecting ? (
                      <span className={s.connectingSpan}>
                        <RefreshCw size={11} className={s.spinIcon} />
                        Waiting...
                      </span>
                    ) : (
                      "Connect ↗"
                    )}
                  </div>
                </button>
              );
            })}
          </div>


          <div className={s.securityNote}>
            <strong>Zero-Knowledge Read:</strong> Factor evaluates pre-trade execution gates deterministically. Private keys never leave your browser extension.
          </div>
        </div>

        {/* Footer */}
        <div className={s.footer}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={12} color="var(--lime)" />
            <span>Solana Mainnet-Beta</span>
          </div>
          <span>Token-2022 Ready</span>
        </div>
      </div>
    </div>
  );
};
