import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { loginOperatorApi, registerOperatorApi, fetchLiveInventory } from "../services/api";
import { VersionedTransaction } from "@solana/web3.js";

export interface OperatorProfile {
  id: string;
  type: "wallet" | "desk";
  label: string;
  address?: string;
  walletType?: "phantom" | "solflare" | "backpack";
  deskCode?: string;
  firmName?: string;
  connectedAt: number;
  riskFloorBps: number;
  maxSizeUsd: number;
  simulatedBalanceSol: number;
  solBalance?: number;
  usdcBalance?: number;
  isSimulated?: boolean;
}

export interface ConnectResult {
  success: boolean;
  error?: string;
  notInstalled?: boolean;
  installUrl?: string;
}

interface OperatorContextType {
  operator: OperatorProfile | null;
  isConnected: boolean;
  isOperatorModalOpen: boolean;
  isOperatorDrawerOpen: boolean;
  openOperatorModal: () => void;
  closeOperatorModal: () => void;
  openOperatorDrawer: () => void;
  closeOperatorDrawer: () => void;
  connectWallet: (walletType: "phantom" | "solflare" | "backpack") => Promise<ConnectResult>;
  connectSimulatedWallet: (walletType?: "phantom" | "solflare" | "backpack") => void;
  signSolanaTransaction: (txBase64: string) => Promise<string>;
  refreshBalances: () => Promise<void>;
  loginDesk: (params: {
    operatorName: string;
    deskCode: string;
    firmName: string;
    riskFloorBps?: number;
  }) => void;
  loginDeskByCode: (deskCode: string) => Promise<{ success: boolean; error?: string }>;
  registerDesk: (params: {
    name: string;
    deskCode: string;
    firmName: string;
    email?: string;
    riskFloorBps?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateRiskSettings: (settings: { riskFloorBps?: number; maxSizeUsd?: number }) => void;
}

const STORAGE_KEY = "factor_operator_session_v1";

const DEFAULT_RISK_FLOOR = 15.0;
const DEFAULT_MAX_SIZE = 100000;

export const WALLET_DOWNLOAD_URLS: Record<string, string> = {
  phantom: "https://phantom.app/download",
  solflare: "https://solflare.com/download",
  backpack: "https://backpack.app/download",
};

export const getInstalledProvider = (walletType: "phantom" | "solflare" | "backpack") => {
  if (typeof window === "undefined") return null;
  const anyWin = window as any;

  if (walletType === "phantom") {
    if (anyWin.phantom?.solana?.isPhantom) return anyWin.phantom.solana;
    if (anyWin.solana?.isPhantom) return anyWin.solana;
    return null;
  }
  if (walletType === "solflare") {
    if (anyWin.solflare?.isSolflare) return anyWin.solflare;
    if (anyWin.solana?.isSolflare) return anyWin.solana;
    return null;
  }
  if (walletType === "backpack") {
    if (anyWin.backpack) return anyWin.backpack;
    if (anyWin.xnft?.solana) return anyWin.xnft.solana;
    return null;
  }
  return null;
};

const OperatorContext = createContext<OperatorContextType | undefined>(undefined);

export const OperatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [operator, setOperator] = useState<OperatorProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load operator session:", e);
    }
    return null;
  });

  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [isOperatorDrawerOpen, setIsOperatorDrawerOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    if (operator) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(operator));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [operator]);

  const connectWallet = async (
    walletType: "phantom" | "solflare" | "backpack"
  ): Promise<ConnectResult> => {
    const providerName = walletType.charAt(0).toUpperCase() + walletType.slice(1);
    const provider = getInstalledProvider(walletType);

    // 1. Extension is NOT installed or detected in browser
    if (!provider) {
      return {
        success: false,
        notInstalled: true,
        installUrl: WALLET_DOWNLOAD_URLS[walletType],
        error: `${providerName} extension was not found in this browser. Please ensure the extension is installed and enabled, or use a Demo session.`,
      };
    }

    // 2. Real browser extension connection
    try {
      const resp = await provider.connect();
      const rawPubkey = resp?.publicKey || provider.publicKey;
      const pubkey = rawPubkey ? rawPubkey.toString() : null;

      if (!pubkey) {
        return {
          success: false,
          error: `Could not retrieve public key from ${providerName}.`,
        };
      }

      const shortAddress = `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
      const profile: OperatorProfile = {
        id: `sol-${pubkey}`,
        type: "wallet",
        label: `${providerName} (${shortAddress})`,
        address: pubkey,
        walletType,
        connectedAt: Date.now(),
        riskFloorBps: DEFAULT_RISK_FLOOR,
        maxSizeUsd: DEFAULT_MAX_SIZE,
        simulatedBalanceSol: 25.5,
        solBalance: 0,
        usdcBalance: 0,
        isSimulated: false,
      };

      setOperator(profile);
      setIsOperatorModalOpen(false);

      // Async live balance query
      fetchLiveInventory(pubkey).then((inv) => {
        if (inv?.solana) {
          setOperator((prev) =>
            prev && prev.address === pubkey
              ? {
                  ...prev,
                  solBalance: inv.solana.sol,
                  usdcBalance: inv.solana.usdc,
                  simulatedBalanceSol: inv.solana.sol,
                }
              : prev
          );
        }
      });

      return { success: true };
    } catch (err: any) {
      console.warn(`User rejected or error during ${walletType} connection:`, err);
      const isUserRejected =
        err?.code === 4001 ||
        err?.message?.toLowerCase().includes("user rejected") ||
        err?.message?.toLowerCase().includes("cancelled");

      return {
        success: false,
        error: isUserRejected
          ? `Connection request was cancelled in ${providerName}.`
          : err?.message || `Failed to connect with ${providerName}.`,
      };
    }
  };

  const connectSimulatedWallet = (walletType: "phantom" | "solflare" | "backpack" = "phantom") => {
    const providerName = walletType.charAt(0).toUpperCase() + walletType.slice(1);
    const prefixes: Record<string, string> = {
      phantom: "8xK2",
      solflare: "9pQr",
      backpack: "7vLm",
    };
    const prefix = prefixes[walletType] || "8xK2";
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const mockAddress = `${prefix}${Math.random().toString(36).substring(2, 8)}...${randomSuffix}`;

    const profile: OperatorProfile = {
      id: `sol-${mockAddress}`,
      type: "wallet",
      label: `${providerName} (Demo Mode)`,
      address: mockAddress,
      connectedAt: Date.now(),
      riskFloorBps: DEFAULT_RISK_FLOOR,
      maxSizeUsd: DEFAULT_MAX_SIZE,
      simulatedBalanceSol: 42.85,
      isSimulated: true,
    };

    setOperator(profile);
    setIsOperatorModalOpen(false);
  };

  const loginDesk = (params: {
    operatorName: string;
    deskCode: string;
    firmName: string;
    riskFloorBps?: number;
  }) => {
    const profile: OperatorProfile = {
      id: `desk-${params.deskCode.toLowerCase()}`,
      type: "desk",
      label: `${params.operatorName} • ${params.deskCode}`,
      deskCode: params.deskCode,
      firmName: params.firmName,
      connectedAt: Date.now(),
      riskFloorBps: params.riskFloorBps || DEFAULT_RISK_FLOOR,
      maxSizeUsd: 250000,
      simulatedBalanceSol: 150.0,
    };

    setOperator(profile);
    setIsOperatorModalOpen(false);
  };

  const loginDeskByCode = async (deskCode: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await loginOperatorApi(deskCode);
      if (!res.success || !res.operator) {
        return { success: false, error: res.error || "Desk code not found" };
      }
      const profile: OperatorProfile = {
        id: res.operator.id,
        type: "desk",
        label: `${res.operator.name} • ${res.operator.deskCode}`,
        deskCode: res.operator.deskCode,
        firmName: res.operator.firmName,
        connectedAt: Date.now(),
        riskFloorBps: res.operator.riskFloorBps || DEFAULT_RISK_FLOOR,
        maxSizeUsd: res.operator.maxSizeUsd || DEFAULT_MAX_SIZE,
        simulatedBalanceSol: 150.0,
      };
      setOperator(profile);
      setIsOperatorModalOpen(false);
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  };

  const registerDesk = async (params: {
    name: string;
    deskCode: string;
    firmName: string;
    email?: string;
    riskFloorBps?: number;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await registerOperatorApi(params);
      if (!res.success || !res.operator) {
        return { success: false, error: res.error || "Registration failed" };
      }
      const profile: OperatorProfile = {
        id: res.operator.id,
        type: "desk",
        label: `${res.operator.name} • ${res.operator.deskCode}`,
        deskCode: res.operator.deskCode,
        firmName: res.operator.firmName,
        connectedAt: Date.now(),
        riskFloorBps: res.operator.riskFloorBps || DEFAULT_RISK_FLOOR,
        maxSizeUsd: res.operator.maxSizeUsd || DEFAULT_MAX_SIZE,
        simulatedBalanceSol: 150.0,
      };
      setOperator(profile);
      setIsOperatorModalOpen(false);
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  };

  const logout = () => {
    setOperator(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setIsOperatorDrawerOpen(false);
  };

  const updateRiskSettings = (settings: { riskFloorBps?: number; maxSizeUsd?: number }) => {
    setOperator((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        riskFloorBps: settings.riskFloorBps ?? prev.riskFloorBps,
        maxSizeUsd: settings.maxSizeUsd ?? prev.maxSizeUsd,
      };
    });
  };

  const signSolanaTransaction = async (txBase64: string): Promise<string> => {
    if (!operator || !operator.walletType) {
      throw new Error("No real wallet connected to sign transaction.");
    }
    const provider = getInstalledProvider(operator.walletType);
    if (!provider) {
      throw new Error(`Wallet provider for ${operator.walletType} not found.`);
    }

    const binaryString = atob(txBase64);
    const rawTx = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      rawTx[i] = binaryString.charCodeAt(i);
    }
    const vTx = VersionedTransaction.deserialize(rawTx);

    if (provider.signTransaction) {
      const signed = await provider.signTransaction(vTx);
      const serialized = signed.serialize();
      let binary = "";
      for (let i = 0; i < serialized.length; i++) {
        binary += String.fromCharCode(serialized[i]);
      }
      return btoa(binary);
    } else if (provider.signAndSendTransaction) {
      const res = await provider.signAndSendTransaction(vTx);
      return res.signature || (typeof res === "string" ? res : "");
    }
    throw new Error("Connected wallet does not support signTransaction.");
  };

  const refreshBalances = useCallback(async () => {
    if (!operator?.address || operator.isSimulated) return;
    const inv = await fetchLiveInventory(operator.address);
    if (inv?.solana) {
      setOperator((prev) =>
        prev
          ? {
              ...prev,
              solBalance: inv.solana.sol,
              usdcBalance: inv.solana.usdc,
              simulatedBalanceSol: inv.solana.sol,
            }
          : null
      );
    }
  }, [operator?.address, operator?.isSimulated]);

  return (
    <OperatorContext.Provider
      value={{
        operator,
        isConnected: !!operator,
        isOperatorModalOpen,
        isOperatorDrawerOpen,
        openOperatorModal: () => setIsOperatorModalOpen(true),
        closeOperatorModal: () => setIsOperatorModalOpen(false),
        openOperatorDrawer: () => setIsOperatorDrawerOpen(true),
        closeOperatorDrawer: () => setIsOperatorDrawerOpen(false),
        connectWallet,
        connectSimulatedWallet,
        signSolanaTransaction,
        refreshBalances,
        loginDesk,
        loginDeskByCode,
        registerDesk,
        logout,
        updateRiskSettings,
      }}
    >
      {children}
    </OperatorContext.Provider>
  );
};

export const useOperator = () => {
  const context = useContext(OperatorContext);
  if (!context) {
    throw new Error("useOperator must be used within an OperatorProvider");
  }
  return context;
};
