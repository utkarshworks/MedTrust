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
    <header className="flex h-[76px] items-center justify-between border-b border-[#e8e9f0] bg-white px-6 sm:px-8 lg:px-10">
      <div>
        <p className="text-sm text-[#858694]">Patient dashboard</p>
        <h1 className="text-xl font-semibold tracking-tight">
          Your health records
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {mounted && connected && publicKey ? (
          <div className="hidden rounded-full border border-[#e4e5ec] bg-[#fafafd] px-3 py-2 text-xs text-[#6f7180] sm:block">
            {shortAddress}
          </div>
        ) : mounted ? (
          <WalletMultiButton />
        ) : (
          <div className="h-9 w-[130px]" />
        )}

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ebe9ff] text-sm font-semibold text-[#5548d8]">
          U
        </div>
      </div>
    </header>
  );
}
