# Project Brief: VKU Market - Smart Inventory & Traceability

## Vision
To build a Web2.5 Enterprise Resource Planning (ERP) and Traceability system for a specific retailer (VKU Market). The system bridges off-chain traditional inventory management (MySQL) with on-chain immutable product tracing (Ethereum/Sepolia Blockchain).

## Core Problem Solved
Traditional supply chains lack transparency, and purely Web3 E-commerce apps are too slow/expensive for daily inventory updates. This project separates **Master Data (off-chain)** from **Tracking Events (on-chain)**, automating inventory numbers when logistics are completed, ensuring trust without sacrificing speed.

## Target Audience
- **Retail Staff (VKU Market):**: Need a fast dashboard to manage stock and update product images.
- **Logistics (Shippers):**: Need to update delivery statuses.
- **Consumers:**: Need to scan a QR code to see exactly where their product came from and if it's currently in stock.

## Tech Stack
- **Frontend**: Next.js 15+ (App Router), Tailwind CSS
- **State Management**: Zustand
- **Web3**: Wagmi, Viem, RainbowKit (Target: Sepolia Testnet)
- **Database**: Prisma ORM with MySQL
- **Images**: Cloudinary (via `next-cloudinary`)
- **UI/UX**: Leaflet (Maps), Html5-qrcode (Scanning)

## Core Features
1. **Producer Portal**: Batch creation, product templating, and on-chain deployment.
2. **Inventory System**: Real-time tracking of warehouse vs. display stock.
3. **Tracking & Maps**: Visual history of products from origin to delivery.
4. **Web3 Identity**: Wallet-based authentication and Role-Based Access Control (RBAC).
5. **Last-Mile Delivery**: Order management and automated ownership transfer upon delivery.
