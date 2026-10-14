import type { Metadata } from "next";
import { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { WalletProviderWrapper } from "@/components/WalletProvider";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedTrust — Patient-Controlled Health Records",
  description:
    "MedTrust gives patients control over medical record integrity, consent, and access using Solana.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <WalletProviderWrapper>
          <ToastProvider>{children}</ToastProvider>
        </WalletProviderWrapper>
        <Analytics />
      </body>
    </html>
  );
}

