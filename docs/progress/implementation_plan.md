# Architecture Cleanup — Backend & Web

## Problem

Both codebases have grown organically and are becoming hard to maintain.

### Backend Issues (`main.py` — 527 lines)

| Issue | Example |
|-------|---------|
| **40+ `include_router` blocks** scattered with mixed import styles | Some at top (L21-23), rest scattered inline (L216-488) |
| **Duplicate router registration** | `assets.router` registered twice (L244 + L349) |
| **Duplicate import** | `activity_log` imported twice (L404 + L406) |
| **Duplicate endpoint files** | `invoice_ingest.py` + `invoice_ingestion.py` (both registered!) |
| **`pricing.py` + `product_pricing.py`** | Two pricing files, both registered |
| **Commented-out router blocks** | Opname (L205-211), invoices (L213) |
| **No test directory** | 0 tests found |

### Web Issues (`App.jsx` — 270 lines)

| Issue | Example |
|-------|---------|
| **92 imports** at top of one file | All pages imported eagerly |
| **Duplicate route** | `production/profitability` (L141 + L142, exact same) |
| **Duplicate route** | QC registered twice (L157 "Legacy" + L160) |
| **Duplicate routes** | `dispatch` and `outbound` → same component (L163-164) |
| **Commented-out routes** | `InventoryDashboard` (L25, L171), `InvoiceInboxPage` (L189) |
| **Monolithic file** | All 92 imports + routes in one 270-line file |

> [!CAUTION]
> This is a **refactor-only** change — no features are added or removed. The app must work exactly the same after cleanup.

## Proposed Changes

### Phase 1: Backend — Clean `main.py`

#### [MODIFY] [main.py](file:///c:/Users/micha/kapanlulusoi/backend-hose-ai/main.py)

**Replace 400+ lines of scattered `include_router` calls with a centralized router registry:**

1. Move all imports to top-of-file, consolidated
2. Create a `ROUTER_REGISTRY` list-of-dicts defining every router + prefix + tags
3. Loop over registry to register all routers in ~5 lines
4. Remove duplicate registrations (`assets` x2, `activity_log` x2)
5. Remove inline scattered imports
6. Remove commented-out code

**Before (lines 216-488):**
```python
from app.api.v1.endpoints import invoice_ingest
app.include_router(invoice_ingest.router, prefix="/api/v1", tags=["..."])

from app.api.v1.endpoints import reports
app.include_router(reports.router, prefix="/api/v1", tags=["..."])
# ... 30 more of these ...
```

**After:**
```python
ROUTER_REGISTRY = [
    (scan.router,             "/api/v1",            ["Hose Scanner"]),
    (auth.router,             "/api/v1",            ["Auth"]),
    (locations.router,        "/api/v1",            ["WMS - Locations"]),
    # ... all 38 routers in one clean list ...
]

for router, prefix, tags in ROUTER_REGISTRY:
    app.include_router(router, prefix=prefix, tags=tags)
```

**Result:** `main.py` shrinks from **527 → ~180 lines**, zero duplicates.

---

### Phase 2: Web — Clean `App.jsx`

#### [MODIFY] [App.jsx](file:///c:/Users/micha/kapanlulusoi/src/App.jsx)

1. **Add React.lazy()** for all page imports (code-splitting / performance boost)
2. **Remove duplicate routes** (`production/profitability`, `/qc`, `dispatch`=`outbound`)
3. **Remove commented-out imports and routes**
4. **Group imports** by domain with clear section comments

**Before:**
```jsx
import Dashboard from './pages/Dashboard/Dashboard';
import Production from './pages/Production/Production';
// ... 90 more immediate imports
```

**After:**
```jsx
import { lazy, Suspense } from 'react';
// Core (not lazy)
import Login from './pages/Auth/Login';

// Lazy-loaded pages - grouped by domain
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const JobOrders = lazy(() => import('./pages/Production/JobOrders'));
// ...
```

Plus wrap routes in `<Suspense fallback={<LoadingSpinner />}>`.

**Result:** `App.jsx` becomes cleaner, duplicate routes removed, and pages are lazy-loaded for better performance.

---

### Phase 3: Verify No Duplicates Left

#### [DELETE candidates] (investigate before deleting)
- `invoice_ingest.py` vs `invoice_ingestion.py` — check if both are used, consolidate
- `pricing.py` vs `product_pricing.py` — check overlap

## Verification Plan

### Automated Tests
- No existing tests found. Will not create new tests for this refactor.

### Manual Verification

1. **Backend:** Run `python main.py` — confirm all routes load without errors, check `/docs` to verify all endpoints listed
2. **Web:** Run `npm run dev` — confirm all pages load, no white screens
3. **Spot-check:** Navigate to 5+ random pages on web to confirm routing still works

> [!IMPORTANT]
> Since there are no automated tests, please verify by running both apps and checking that key pages still work after the refactor. I recommend testing at least: Dashboard, Inbound, Production, Sales, Inventory, and Finance pages.
