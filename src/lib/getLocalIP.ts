import os from 'os';

// ─── Virtual adapter name patterns to exclude ─────────────────────────────────
const VIRTUAL_PATTERNS = [
  'vbox', 'virtual', 'radmin', 'hamachi', 'vmware', 'docker',
  'vpn', 'tailscale', 'zerotier', 'hyper-v', 'loopback',
];

// ─── Genuine physical adapter name patterns to prioritize ─────────────────────
const PHYSICAL_PATTERNS = ['wi-fi', 'wlan', 'wireless', 'ethernet', 'eth0', 'en0'];

/**
 * Dynamically resolve the machine's current local IPv4 address
 * from the network adapter tree.
 *
 * CRITICAL: Skips virtual tunnels (Radmin VPN, VirtualBox, Hamachi, Docker, etc.)
 * and prioritizes genuine Wi-Fi / Wireless / Ethernet adapters.
 */
export function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  let fallbackIP = 'localhost';

  for (const name of Object.keys(interfaces)) {
    const nameLower = name.toLowerCase();

    // Skip known virtual/tunnel adapters
    const isVirtual = VIRTUAL_PATTERNS.some(pattern => nameLower.includes(pattern));
    if (isVirtual) continue;

    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Drop 26.x.x.x space (often used by Radmin/Hamachi)
        if (iface.address.startsWith('26.')) continue;
        
        // Prioritize genuine physical adapters — return immediately
        const isPhysical = PHYSICAL_PATTERNS.some(pattern => nameLower.includes(pattern));
        if (isPhysical) {
          return iface.address;
        }
        // Store as fallback if no physical adapter name matches
        fallbackIP = iface.address;
      }
    }
  }

  return fallbackIP;
}

/**
 * Get the application base URL for QR code generation.
 * Priority order:
 * 1. NEXT_PUBLIC_APP_URL env variable (e.g., ngrok public address)
 * 2. Auto-discovered LAN IP + port 3000
 * 3. Fallback to localhost:3000
 */
export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  const ip = getLocalIP();
  return `http://${ip}:3000`;
}
