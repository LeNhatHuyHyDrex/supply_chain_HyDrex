import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/providers/Web3Provider";
import { UserProvider } from "@/providers/UserProvider";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "VKU Market — Blockchain Fruit E-commerce",
  description:
    "Blockchain-verified fruit marketplace with real-time traceability and inventory management. Built for VKU — Vietnam-Korea University.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&family=Barlow:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="bg-slate-50 text-slate-900 dark:bg-[#0A0A0B] dark:text-white transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Web3Provider>
            <UserProvider>
              {children}
            </UserProvider>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
