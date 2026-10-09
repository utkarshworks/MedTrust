"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Header() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { publicKey, connected } = useWallet();

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "";

  return (
    <header className="sticky top-0 z-20 flex min-h-[82px] items-center justify-between border-b border-[#e9eaf0] bg-white/95 px-4 backdrop-blur-sm sm:px-8 lg:px-10">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[1.4px] text-[#9296a5]">
            Patient workspace
          </span>
          <span className="h-1 w-1 rounded-full bg-[#c7c9d3]" />
          <span className="text-[11px] text-[#9296a5]">Solana Devnet</span>
        </div>

        <h1 className="text-[19px] font-semibold tracking-[-0.6px] text-[#171b2c] sm:text-[21px]">
          Your health records
        </h1>
      </div>

      <div className="ml-4 flex shrink-0 items-center gap-3">
        {mounted && connected && publicKey ? (
          <div className="hidden items-center gap-2 rounded-lg border border-[#e8e9f0] bg-[#fafafd] px-3 py-2 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3d9569]" />
            <span className="font-mono text-xs text-[#555b6e]">
              {shortAddress}
            </span>
          </div>
        ) : mounted ? (
          <WalletMultiButton />
        ) : (
          <div className="h-10 w-[130px]" />
        )}

        <div
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e6e2ff] bg-[#f1efff] text-[12px] font-semibold text-[#5144d8]"
          aria-label="Patient profile"
          title="Patient profile"
        >
          U
        </div>
      </div>
    </header>
  );
}
