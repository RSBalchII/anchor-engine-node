# Standard 074: Atomic Frontend Architecture

**Category:** Architecture / Frontend
**Status:** Draft
**Date:** 2026-01-24

## 1. Philosophy
The frontend follows an **Atomic Design** philosophy, refined for a "Glassmorphic" aesthetic. The goal is to create a highly modular, reusable, and uniform UI that separates *presentation*, *features*, and *data*.

## 2. Directory Structure
The `src` directory is organized into strict layers:

```
src/
├── components/
│   ├── ui/          # [ATOMS] Pure, dumb UI primitives (Button, Input, Badge)
│   ├── features/    # [MOLECULES/ORGANISMS] Complex, logic-bound components (SearchColumn)
│   └── layout/      # [TEMPLATES] Page structures (Grid, Dashboard)
├── services/        # [LOGIC] Pure TypeScript API clients and utilites
└── App.tsx          # [PAGES] The main entry point and router
```

## 3. The Layers

### 3.1 UI Atoms (`src/components/ui`)
*   **Rule**: These components MUST NOT contain business logic or API calls.
*   **Rule**: They must rely on `props` for all data and callbacks.
*   **Styling**: Use globally defined CSS variables (e.g., `var(--glass-bg)`, `var(--accent-primary)`).
*   **Key Components**:
    *   `GlassPanel`: The fundamental container.
    *   `Button`: Standardized interaction points.
    *   `Input`: Standardized form elements.

### 3.2 Feature Components (`src/components/features`)
*   **Rule**: These components represent distinct "Capabilities" of the system (e.g., "Search", "Chat", "Research").
*   **Responsibilities**:
    *   Managing local state.
    *   Calling `services/api.ts`.
    *   Composing UI Atoms.
*   **Example**: `SearchColumn` manages the query state, calls `api.search`, and renders results using `GlassPanel` and `Badge`.
*   **Example**: `QuarantinePage` (Infection Center) manages the list of quarantined atoms, allowing for "Cure" (restore) operations.

### 3.4 Routing & Navigation
*   **Strategy**: Hash-based routing (`#search`, `#quarantine`, `#dashboard`).
*   **Navigation**:
    *   **Dashboard**: Central hub.
    *   **Global Back Arrow**: A fixed-position "Back" button appears on all non-dashboard pages to ensure users can always return to the root.
    *   **Header Navigation**: Context-specific command bars (e.g., Search Header) provide quick jumps to other modules.

### 3.3 Service Layer (`src/services`)
*   **Rule**: All network I/O MUST be centralized here.
*   **Benefit**: Allows for easy mocking, type-checking, and "Quarantine" interception.
*   **File**: `api.ts` is the singleton entry point for backend communication.

## 4. Design System (Glassmorphism)
*   **Visual Language**: Translucency (`backdrop-filter: blur`), dark mode default, neon accents.
*   **Variables**: Defined in `index.css`.
*   **Typography**: Clean sans-serif (Inter/System UI).

## 5. State Management
*   **Standard**: React `useState` and `useEffect` for local state.
*   **Global**: Minimal usage. Prefer "Lifted State" in `App.tsx` only for layout coordination (e.g., managing the list of active columns).
