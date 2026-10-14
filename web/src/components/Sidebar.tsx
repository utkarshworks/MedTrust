"use client";

import React from "react";

export type NavTab =
  | "Overview"
  | "Medical Records"
  | "Access Control"
  | "Activity"
  | "Provider Portal"
  | "Platform Admin";

export type UserRole = "Patient" | "Provider" | "Admin";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  mobileOpen?: boolean;
  onClose?: () => void;
  onOpenProfile?: () => void;
  patientName?: string;
  providerName?: string;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  badge?: string;
  badgeVariant?: "neutral" | "brand" | "emerald";
  icon: React.ReactNode;
}

const patientNavItems: NavItemConfig[] = [
  {
    id: "Overview",
    label: "Overview",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1.5" />
        <rect width="7" height="5" x="14" y="3" rx="1.5" />
        <rect width="7" height="9" x="14" y="12" rx="1.5" />
        <rect width="7" height="5" x="3" y="16" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "Medical Records",
    label: "Medical Records",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="M9 15h6" />
      </svg>
    ),
  },
  {
    id: "Access Control",
    label: "Access Control",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    id: "Activity",
    label: "Audit Trail",
    badge: "Live",
    badgeVariant: "emerald",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
];

const providerNavItems: NavItemConfig[] = [
  {
    id: "Provider Portal",
    label: "Clinical Records",
    badge: "Active",
    badgeVariant: "brand",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: "Activity",
    label: "Access Audit Log",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
];

const adminNavItems: NavItemConfig[] = [
  {
    id: "Platform Admin",
    label: "Governance & Licensing",
    badge: "Admin",
    badgeVariant: "neutral",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      </svg>
    ),
  },
  {
    id: "Activity",
    label: "Security Compliance Log",
    badge: "Realtime",
    badgeVariant: "emerald",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
];

export default function Sidebar({
  activeTab,
  onTabChange,
  currentRole = "Patient",
  onRoleChange,
  mobileOpen = false,
  onClose,
  onOpenProfile,
  patientName = "Alex Rivera",
  providerName = "MedTrust Demo Clinic",
}: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close navigation"
          onClick={onClose}
          onKeyDown={(e) => e.key === "Escape" && onClose?.()}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200/90 bg-white px-4 py-6 shadow-xs transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white shadow-md shadow-indigo-500/20">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-slate-900 text-base">
                  MedTrust
                </span>
                <span className="rounded bg-indigo-50 px-1 py-0.2 text-[9px] font-bold text-indigo-700 tracking-wide">
                  MVP
                </span>
              </div>
              <span className="block text-[11px] font-medium text-slate-400">
                Patient Provenance
              </span>
            </div>
          </div>

          {mobileOpen && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
              aria-label="Close menu"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Role Selector Pill */}
        <div className="mb-4 px-2">
          <div className="flex items-center rounded-xl border border-slate-200/90 bg-slate-100/80 p-0.5 text-xs font-semibold shadow-2xs">
            <button
              type="button"
              onClick={() => onRoleChange("Patient")}
              className={`flex-1 py-1.5 text-center rounded-lg transition ${
                currentRole === "Patient"
                  ? "bg-white text-indigo-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Patient
            </button>
            <button
              type="button"
              onClick={() => onRoleChange("Provider")}
              className={`flex-1 py-1.5 text-center rounded-lg transition ${
                currentRole === "Provider"
                  ? "bg-white text-indigo-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Clinic
            </button>
            <button
              type="button"
              onClick={() => onRoleChange("Admin")}
              className={`flex-1 py-1.5 text-center rounded-lg transition ${
                currentRole === "Admin"
                  ? "bg-white text-indigo-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {/* Persona Identity Bar */}
        {currentRole === "Patient" && (
          <div className="mb-5 px-2">
            <button
              type="button"
              onClick={onOpenProfile}
              className="group flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-xs">
                  {patientName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800 truncate">
                    {patientName}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    Patient Identity (O+)
                  </span>
                </div>
              </div>
              <svg className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        )}

        {currentRole === "Provider" && (
          <div className="mb-5 px-2">
            <div className="flex items-center gap-2.5 rounded-xl border border-indigo-200/80 bg-indigo-50/60 p-2.5 shadow-2xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-xs">
                🩺
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-slate-900 truncate">
                  {providerName}
                </span>
                <span className="block text-[10px] text-indigo-600 font-semibold">
                  Verified Healthcare Practice
                </span>
              </div>
            </div>
          </div>
        )}

        {currentRole === "Admin" && (
          <div className="mb-5 px-2">
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-100/70 p-2.5 shadow-2xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-white shadow-xs">
                🛡️
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-slate-900 truncate">
                  Platform Governance
                </span>
                <span className="block text-[10px] text-slate-500 font-medium">
                  Compliance & Licensing Authority
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Role-Gated Navigation */}
        <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {currentRole === "Patient"
            ? "Patient Workspace"
            : currentRole === "Provider"
              ? "Clinical Workspace"
              : "Governance & Compliance"}
        </div>

        <nav className="space-y-1 mb-5" aria-label="Role navigation">
          {(currentRole === "Patient"
            ? patientNavItems
            : currentRole === "Provider"
              ? providerNavItems
              : adminNavItems
          ).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onTabChange(item.id);
                  onClose?.();
                }}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-50/90 text-indigo-700 shadow-xs font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span
                  className={`transition-colors ${
                    isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                >
                  {item.icon}
                </span>

                <span className="flex-1">{item.label}</span>

                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                      item.badgeVariant === "emerald"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Trust & Architecture Callout */}
        <div className="mt-auto pt-4 border-t border-slate-100">
          <div className="rounded-2xl border border-indigo-100/80 bg-gradient-to-b from-indigo-50/60 to-white p-3.5 shadow-xs">
            <div className="flex items-center gap-2 text-indigo-900 font-semibold text-xs mb-1">
              <span className="flex h-4 w-4 items-center justify-center rounded-md bg-indigo-600 text-white text-[10px]">
                {currentRole === "Patient" ? "🛡️" : currentRole === "Provider" ? "🩺" : "⚖️"}
              </span>
              <span>
                {currentRole === "Patient"
                  ? "Encrypted Vault Active"
                  : currentRole === "Provider"
                    ? "Consent Boundary Gated"
                    : "Platform Governance Active"}
              </span>
            </div>
            <p className="text-[10px] leading-relaxed text-slate-500">
              {currentRole === "Patient"
                ? "Zero plaintext on-chain. AES-256-GCM + Solana SHA-256 anchors."
                : currentRole === "Provider"
                  ? "Access Gated: Storage boundary checks active on-chain consent."
                  : "Institutional oversight: License audits & security logs active."}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
