"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMounted } from "@/hooks/useMounted";

export type UserRole = "Patient" | "Provider" | "Admin";

interface HeaderProps {
  activeTabTitle?: string;
  patientName?: string;
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  onOpenCreateRecord?: () => void;
  onOpenProfile?: () => void;
  onToggleMobileMenu?: () => void;
}

export default function Header({
  activeTabTitle = "Overview",
  patientName = "Alex Rivera",
  currentRole = "Patient",
  onRoleChange,
  onOpenCreateRecord,
  onOpenProfile,
  onToggleMobileMenu,
}: HeaderProps) {
  const mounted = useMounted();
  const { publicKey, connected } = useWallet();

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "";

  const initials = patientName
    ? patientName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AR";

  return (
    <header className="sticky top-0 z-30 flex min-h-[70px] sm:min-h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-3.5 sm:px-8 backdrop-blur-md transition-all">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={onToggleMobileMenu}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 transition lg:hidden"
          >
            <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        )}

        <div className="min-w-0">
          <div className="mb-0.5 sm:mb-1 flex items-center gap-1.5 sm:gap-2">
            <span className="hidden sm:inline text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              MedTrust Security Protocol
            </span>
            <span className="hidden sm:inline h-1 w-1 rounded-full bg-slate-300" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Solana Devnet
            </span>
          </div>

          <h1 className="text-base sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
            {activeTabTitle}
          </h1>
        </div>
      </div>

      <div className="ml-4 flex shrink-0 items-center gap-3">
        {onRoleChange && (
          <div className="hidden md:flex items-center rounded-xl border border-slate-200/90 bg-slate-100/80 p-0.5 text-xs font-semibold shadow-2xs">
            <button
              type="button"
              onClick={() => onRoleChange("Patient")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                currentRole === "Patient"
                  ? "bg-white text-indigo-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="text-[11px]">👤</span>
              <span>Patient</span>
            </button>
            <button
              type="button"
              onClick={() => onRoleChange("Provider")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                currentRole === "Provider"
                  ? "bg-white text-indigo-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="text-[11px]">🩺</span>
              <span>Provider</span>
            </button>
            <button
              type="button"
              onClick={() => onRoleChange("Admin")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                currentRole === "Admin"
                  ? "bg-white text-indigo-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="text-[11px]">🛡️</span>
              <span>Admin</span>
            </button>
          </div>
        )}

        {onOpenCreateRecord && currentRole !== "Admin" && (
          <button
            type="button"
            onClick={onOpenCreateRecord}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>{currentRole === "Provider" ? "Issue Record" : "Upload Record"}</span>
          </button>
        )}

        {mounted && connected && publicKey && (
          <div className="hidden md:flex items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-1.5 shadow-xs">
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Connected
              </span>
              <span className="font-mono text-xs font-medium text-slate-700">
                {shortAddress}
              </span>
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
          </div>
        )}

        <div className="relative">
          {mounted ? (
            <WalletMultiButton />
          ) : (
            <div className="h-[38px] w-[138px] rounded-xl bg-slate-100 animate-pulse" />
          )}
        </div>

        {currentRole === "Patient" && onOpenProfile && (
          <button
            type="button"
            onClick={onOpenProfile}
            title={`View Patient Profile (${patientName})`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs"
          >
            {initials}
          </button>
        )}

        {currentRole === "Provider" && (
          <div
            title="Healthcare Provider Persona Active"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-sm shadow-xs"
          >
            🩺
          </div>
        )}

        {currentRole === "Admin" && (
          <div
            title="Governance Administrator Persona Active"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-slate-800 text-sm shadow-xs"
          >
            🛡️
          </div>
        )}
      </div>
    </header>
  );
}
