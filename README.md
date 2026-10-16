# Factor Execution Terminal

Institutional cross-venue execution terminal for tokenized equities (xStocks) on Solana.

Factor continuously evaluates real-time orderbooks across centralized venues (Kraken, Gate.io, Bybit) and Solana DEX liquidity (Jupiter), enforcing deterministic pre-trade gates before clearing execution.

---

## Key Capabilities

- **Real-Time Cross-Venue Matrix**:
  - Live orderbook surveillance across 22 tokenized equities.
  - Automated detection of positive net residual edge after taker fees, Solana network gas, and CEX withdrawal rebalance friction.
  - Category filtering across Mega Tech, Semiconductors, Index ETFs, Fintech & Crypto, and Value & Growth.

- **Pre-Trade 6-Gate Clearance**:
  - **G1**: Net Edge Hurdle ($\ge$ 15.0 bps).
  - **G2**: 3-Source Reference Quorum ($\Delta \le$ 20.0 bps against Pyth & primary equities).
  - **G3**: NYSE Regular Session verification (09:30–16:00 ET).
  - **G4**: Rebalance Friction verification ($0.05 withdrawal confirmed).
  - **G5**: Corporate Actions & Splits hold check.
  - **G6**: Hardware Circuit Breaker nominal state check.

- **Institutional Safety Controls**:
  - Manual operator kill switch with persistent SQLite state.
  - Real-time telemetry monitoring venue latency, spread decay, and circuit status.

- **Solana Wallet & Settlement Identity**:
  - Support for Phantom, Solflare, and Backpack browser extensions.
  - Zero-knowledge read-only verification: evaluates execution hurdles deterministically without touching private keys.
  - Built-in sandbox simulation mode for offline yield modeling.

- **Yield Modeler**:
  - Scenario planning across trade sizes ($5k, $10k, $25k, $50k).
  - Net residual yield calculations with custom holding period carry costs.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Vanilla CSS with tailored design tokens (Dark mode, Electric Lime `#d4f55c` accents)
- **Icons**: Lucide React
- **Data Protocols**: Server-Sent Events (SSE) live stream with automatic fallback simulation

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The terminal will be accessible at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

---

## Architecture Overview

```
factor-app/
├── src/
│   ├── components/
│   │   ├── Auth/           # Solana Wallet Connection Modal
│   │   ├── Common/         # Brand Logo, Toasts, Modals
│   │   ├── Header/         # Navigation, Telemetry Vital Signs, Wallet Status
│   │   ├── Inspector/      # Dislocation Deep-Dive & Pre-Trade Gate Inspector
│   │   ├── Matrix/         # Master Opportunities Matrix & Category Filters
│   │   ├── Operator/       # Operator Drawer & Execution History
│   │   ├── Safety/         # Circuit Breaker & Safety Control Panel
│   │   └── Simulator/      # Yield Modeler & Execution Ticket Stamping
│   ├── context/            # Operator & Wallet Identity Context
│   ├── data/               # 22 Tokenized Equities Registry & Mint Addresses
│   ├── engine/             # Deterministic Edge & Gate Clearance Formulas
│   ├── hooks/              # Live SSE Scanner Hook & Keyboard Navigation
│   ├── services/           # Backend Bridge & SQLite Persistence API
│   ├── styles/             # Design Tokens & Global CSS
│   └── types/              # Market & Protocol Type Definitions
```

---

## License

Proprietary — Factor Protocol.
