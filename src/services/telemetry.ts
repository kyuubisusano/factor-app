/**
 * Privacy-First Anonymous Telemetry
 * 
 * Strict Privacy Guarantees:
 * - ZERO IP address storage
 * - ZERO wallet address association
 * - ZERO cookies or session tokens
 * - ZERO device fingerprinting
 * 
 * Only increments a daily aggregate counter on the backend (e.g., simulations_run: +1).
 */
export function trackAnonymousEvent(event: string): void {
  try {
    fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    }).catch(() => {
      // Non-blocking fire-and-forget
    });
  } catch {
    // Non-blocking fire-and-forget
  }
}
