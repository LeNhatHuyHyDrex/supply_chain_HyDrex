import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external physical devices on LAN to receive HMR updates
  allowedDevOrigins: ['192.168.2.31'],
};

export default nextConfig;
