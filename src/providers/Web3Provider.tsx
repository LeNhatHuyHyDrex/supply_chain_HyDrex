'use client';

import * as React from 'react';
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import {
  sepolia,
  hardhat,
} from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http, fallback } from 'wagmi';
import { useTheme } from 'next-themes';

const config = getDefaultConfig({
  appName: 'VKU Market',
  projectId: 'YOUR_PROJECT_ID', // Replace with your WalletConnect project ID
  chains: [sepolia, hardhat],
  transports: {
    [sepolia.id]: fallback([
      // 1. Primary: Use the one from .env if it works
      http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_URL),
      // 2. Reliable Public Fallbacks (Auto-switch if Primary throws 502/503)
      http('https://rpc.sepolia.org'),
      http('https://1rpc.io/sepolia'),
      http('https://rpc2.sepolia.org'),
      http('https://endpoints.omniatech.io/v1/eth/sepolia/public')
    ]),
    [hardhat.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

function RainbowKitThemeWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  const rainbowTheme = mounted && resolvedTheme === 'light'
    ? lightTheme({ accentColor: '#059669', accentColorForeground: 'white', borderRadius: 'medium' })
    : darkTheme({ accentColor: '#059669', accentColorForeground: 'white', borderRadius: 'medium' });

  return (
    <RainbowKitProvider theme={rainbowTheme}>
      {children}
    </RainbowKitProvider>
  );
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitThemeWrapper>
          {children}
        </RainbowKitThemeWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
