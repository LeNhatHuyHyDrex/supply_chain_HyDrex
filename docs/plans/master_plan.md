# MASTER PLAN: VKU Market - Smart Inventory & Traceability

## Status Legend
✅ Completed | ⏳ In Progress | 📝 Planned

## Phase 1: Foundation & Identity ✅
- [x] Setup Next.js, Tailwind, Prisma, MySQL.
- [x] Implement Web3-Native Identity (Wallet -> Display Name mapping).
- [x] Implement RBAC (Admin, Supplier, Shipper, Customer).

## Phase 2: Web2.5 Hybrid Data & Storage ✅
- [x] Integrate Cloudinary for off-chain image storage.
- [x] Build Smart Contract for status tracking on Sepolia.
- [x] Implement BigInt safe serialization for viem/wagmi.

## Phase 3: The ERP Pivot (Current State) ⏳
- [x] Separate E-commerce logic into ERP logic (Master Data vs Batches).
- [x] Automate Inventory: Link Logistics "Delivered" status to MySQL `inWarehouse` increment.
- [x] Refactor `ProducerPortal` to handle "Create New" vs "Restock".
- [x] Refactor UI to show "In Stock" vs "Sold Out" based on real DB counts.

## Phase 4: UI/UX & Traceability Polish 📝
- [ ] Implement QR Code generation on Product Catalog.
- [ ] Build the Consumer `TrackProduct` view with Leaflet mapping and Origin timeline.
- [ ] Clean up Admin Dashboards.

## Phase 5: Final Review & Release 📝
- [ ] Security audit (API route protection based on roles).
- [ ] Code refactoring and component optimization.
- [ ] Deployment prep (Vercel env vars, DB migration to cloud).
