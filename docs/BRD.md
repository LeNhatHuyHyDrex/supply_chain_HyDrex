# BUSINESS REQUIREMENTS DOCUMENT (BRD)

## 1. User Personas & RBAC (Role-Based Access Control)
Identity is managed via Web3 Wallets (No Email/Password). Roles are mapped in Prisma.
- **ADMIN / SUPPLIER (Staff):** Can create Product Templates, Restock Batches, edit images, and move inventory (Warehouse -> Shelf -> Sold).
- **SHIPPER (Logistics):** Can ONLY update tracking statuses (Processing -> Shipped -> Delivered).
- **CUSTOMER:** Can only view the Product Catalog, scan QR codes, and trace product origins.

## 2. Technical Architecture (Web2.5 ERP Pivot)
- **Master Data (Prisma/MySQL):** `ProductTemplate` (ID, Name, Origin, Image URL from Cloudinary).
- **Transactional Data (Blockchain + Prisma):** `BatchRecord` (Blockchain ID mapped to a Template).
- **Automated Inventory Logic:** When a Shipper updates a batch status to `Delivered (2)` on the blockchain, the system automatically triggers a Webhook/API to increment the `inWarehouse` count in MySQL.

## 3. Tech Stack
- **Frontend:** Next.js 14+ (App Router), React, Tailwind CSS.
- **Backend/DB:** Next.js API Routes, Prisma ORM, MySQL (Local via Laragon).
- **Web3:** Wagmi, Viem, Solidity Smart Contract (Deployed on Sepolia).
- **Storage:** Cloudinary (for Product Images - `<CldUploadWidget>`).
- **Mapping:** Leaflet (`react-leaflet`), OpenStreetMap Nominatim (Geocoding).
- **Misc:** `qrcode.react` (for product tracing).

## 4. Key Rules (Do's and Don'ts)
- **DO NOT** store images on the blockchain. Use Cloudinary and Prisma.
- **DO NOT** use NextAuth/Auth.js. Stick to Wagmi `useAccount` mapped to DB `walletAddress`.
- **DO NOT** use JavaScript `Number()` on blockchain `uint256` values. Always safely stringify `bigint` to avoid safe integer limits.
