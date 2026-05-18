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
      http(process.env.NEXT_PUBLIC_RPC_URL),
      http('https://ethereum-sepolia-rpc.publicnode.com'),
      http('https://rpc2.sepolia.org'),
      http(),
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
