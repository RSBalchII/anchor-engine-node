# V3 Architecture: Sovereign Node (Thin Client)

## Core Philosophy
1. **Engine (`/engine`):** A headless Node.js process. Runs CozoDB. Watches `/context`.
2. **Interface (`/interface`):** A static HTML Dashboard. Served by the Engine.
3. **Context (`/context`):** The User's Data. Text files. The only Source of Truth.

## Workflow
- **Phone:** Termux -> `cd engine && npm start` -> Chrome -> `localhost:3000`.
- **Inference:** WebLLM runs in a separate browser tab (Brain).
- **Bridge:** User manually copies Context from Dashboard -> Paste to Brain.