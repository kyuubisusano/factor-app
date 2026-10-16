import { useState, useEffect, useRef } from "react";
import type { ArbitrageOpportunity } from "../types/market";
import { generateOpportunities } from "../engine/simulation";
import { getSseStreamUrl } from "../config/env";

export type ConnectionStatus = "connected" | "connecting" | "offline";

export function normalizeCategory(cat?: string): "Mega Tech" | "Semiconductors" | "Index ETFs" | "Fintech & Crypto" | "Value & Growth" {
  if (!cat) return "Mega Tech";
  const trimmed = cat.trim();
  if (trimmed === "Mega Tech" || trimmed === "Semiconductors" || trimmed === "Index ETFs" || trimmed === "Fintech & Crypto" || trimmed === "Value & Growth") {
    return trimmed;
  }
  const s = cat.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s.includes("fintech") || s.includes("crypto") || s.includes("coin") || s.includes("hood") || s.includes("mstr") || s.includes("crcl")) {
    return "Fintech & Crypto";
  }
  if (s.includes("semi")) {
    return "Semiconductors";
  }
  if (s.includes("etf") || s.includes("index")) {
    return "Index ETFs";
  }
  if (s.includes("value") || s.includes("growth")) {
    return "Value & Growth";
  }
  if (s.includes("mega") || s.includes("tech")) {
    return "Mega Tech";
  }
  return "Mega Tech";
}

interface UseLiveScannerOptions {
  sizeUsd: number;
  marketSession: "OPEN" | "CLOSED";
  rebalanceKnown: boolean;
  circuitTripped: boolean;
}

export function useLiveScanner({
  marketSession,
  rebalanceKnown,
  circuitTripped,
}: UseLiveScannerOptions) {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>(() => {
    const raw = generateOpportunities(marketSession, rebalanceKnown, circuitTripped);
    return raw.map((o) => ({ ...o, category: normalizeCategory(o.category) }));
  });
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastTickTime, setLastTickTime] = useState<number>(Date.now());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const sseUrl = getSseStreamUrl();

    // If in standalone mode without a configured backend (e.g. Vercel preview), run autonomous live ticker
    if (!sseUrl) {
      setStatus("connected");
      const timer = setInterval(() => {
        if (isCancelled) return;
        setOpportunities((prev) =>
          prev.map((opp) => {
            const jitterBps = (Math.random() - 0.49) * 0.4;
            const newNet = Number((opp.netEdgeBps + jitterBps).toFixed(1));
            return {
              ...opp,
              netEdgeBps: newNet,
              quoteAgeMs: Math.floor(Math.random() * 400 + 100),
            };
          })
        );
        setLastTickTime(Date.now());
      }, 2500);

      return () => {
        isCancelled = true;
        clearInterval(timer);
      };
    }

    function connect() {
      if (isCancelled || !sseUrl) return;
      setStatus("connecting");

      try {
        const es = new EventSource(sseUrl);
        eventSourceRef.current = es;

        es.onopen = () => {
          if (isCancelled) return;
          setStatus("connected");
        };

        es.addEventListener("opportunity_tick", (event) => {
          if (isCancelled) return;
          try {
            const data = JSON.parse(event.data);
            if (data.opportunities && Array.isArray(data.opportunities)) {
              const normalized = data.opportunities.map((o: any) => ({
                ...o,
                category: normalizeCategory(o.category),
              }));
              setOpportunities(normalized);
              setLastTickTime(data.timestamp || Date.now());
              setStatus("connected");
            }
          } catch (e) {
            console.error("Failed to parse SSE tick:", e);
          }
        });

        es.onerror = () => {
          if (isCancelled) return;
          setStatus("offline");
          es.close();
          eventSourceRef.current = null;

          // Attempt reconnect after 5 seconds
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isCancelled) connect();
          }, 5000);
        };
      } catch {
        setStatus("offline");
      }
    }

    connect();

    return () => {
      isCancelled = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // When offline, fallback to simulation generation when session/circuit changes
  useEffect(() => {
    if (status === "offline") {
      const raw = generateOpportunities(marketSession, rebalanceKnown, circuitTripped);
      setOpportunities(raw.map((o) => ({ ...o, category: normalizeCategory(o.category) })));
    }
  }, [status, marketSession, rebalanceKnown, circuitTripped]);

  return {
    opportunities,
    status,
    lastTickTime,
    isLive: status === "connected",
  };
}
