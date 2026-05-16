# Phase 1: Performance, UX Polish & RBAC Alignment

## Goal
Optimize the user experience for all personas and ensure the RBAC (Role-Based Access Control) strictly follows the official BRD.

## Tasks

### 🛡️ RBAC & Security (High Priority)
- [x] **Align page-level access**: Remove `SHIPPER` role from Inventory Management view in `page.tsx`.
- [ ] **Enforce API Security**: Add server-side role checks to `/api/inventory` and `/api/templates` to ensure only `ADMIN/SUPPLIER` can modify master data.
- [ ] **Safe BigInt Handling**: Audit all components to ensure no `uint256` values are converted using `Number()`.

### 💎 UX & Retail Polish
- [ ] **QR Print Mode**: Implement a dedicated "Print Label" component for product batches to allow physical tag generation for retail shelves.
- [ ] **Batch History Dashboard**: Create a detailed shipment tracking table for Retail Staff to monitor incoming stock.
- [ ] **Condition Alerts**: Implement a notification banner in the Inventory view if any batch has been marked with a "Bad" condition by Logistics.

### ⚡ Performance
- [ ] **Instant Navigation**: Export `unstable_instant` for route performance optimization as per `node_modules/next/dist/docs/index.md`.

## Status
**In Progress** - Defining implementation steps for RBAC alignment.
