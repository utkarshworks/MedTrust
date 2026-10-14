"use client";

import { useState, useEffect } from "react";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import RestoreVaultModal from "./RestoreVaultModal";
import { HealthcareProvider, AuditLogEntry } from "@/lib/storage";

interface AdminPortalTabProps {
  providers: HealthcareProvider[];
  auditLogs: AuditLogEntry[];
  onRefreshData: () => Promise<void>;
}

interface SystemHealthData {
  status: string;
  uptimeSeconds: number;
  solana: {
    cluster: string;
    status: string;
    currentSlot: number;
    rpcLatencyMs: number;
    programId: string;
  };
  vault: {
    status: string;
    totalDocuments: number;
    verifiedProviders: number;
    pendingProviders: number;
    totalAuditEntries: number;
  };
  latencyMs: number;
}

export default function AdminPortalTab({
  providers,
  auditLogs,
  onRefreshData,
}: AdminPortalTabProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [auditFilter, setAuditFilter] = useState<string>("ALL");
  const [health, setHealth] = useState<SystemHealthData | null>(null);

  // Poll system operational health metrics
  useEffect(() => {
    let ignore = false;
    async function fetchHealth() {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        if (!ignore) {
          setHealth(data);
        }
      } catch (err) {
        console.warn("Health query failed:", err);
      }
    }
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  async function handleUpdateStatus(
    providerId: string,
    newStatus: "Verified" | "Suspended" | "Pending"
  ) {
    try {
      setUpdatingId(providerId);
      const res = await fetch(`/api/providers/${providerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-requester-role": "Admin",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        await onRefreshData();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredLogs = auditLogs.filter((log) => {
    if (auditFilter === "ALL") return true;
    return log.action === auditFilter;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Governance</span>
            <span>/</span>
            <span className="text-indigo-600">Platform Admin</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Administrative Operations & Security
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
            Audit provider credential licenses, enforce access controls, and monitor system-wide cryptographic integrity logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsRestoreOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Restore Vault Backup</span>
          </button>

          <button
            type="button"
            onClick={onRefreshData}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            Refresh Admin State
          </button>
        </div>
      </section>

      {/* Operational Health Metrics (Live) */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Registered Providers
          </span>
          <p className="mt-2 text-2xl font-bold text-slate-900">{providers.length}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{providers.filter((p) => p.verificationStatus === "Verified").length} verified credentials</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Pending Review
          </span>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {providers.filter((p) => p.verificationStatus === "Pending").length}
          </p>
          <div className="mt-3 text-xs text-amber-600 font-medium">Credential audit required</div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Solana RPC Node
          </span>
          <p className="mt-2 text-base font-bold text-slate-900">
            {health?.solana.status || "Devnet Operational"}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{health ? `${health.solana.rpcLatencyMs}ms Latency (Slot #${health.solana.currentSlot})` : "Active"}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Access Enforcements
          </span>
          <p className="mt-2 text-2xl font-bold text-slate-900">100% Gated</p>
          <div className="mt-3 text-xs text-slate-500">Strict on-chain boundary</div>
        </div>
      </section>

      {/* Provider Verification Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Healthcare Provider Licensing & Verification
            </h3>
            <p className="text-xs text-slate-500">
              Review facility credentials, medical board licenses, and authorized public keys.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs divide-y divide-slate-100">
          {providers.map((prov) => (
            <div
              key={prov.id}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 hover:bg-slate-50/60 transition"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{prov.name}</h4>
                    <Badge
                      variant={
                        prov.verificationStatus === "Verified"
                          ? "success"
                          : prov.verificationStatus === "Suspended"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {prov.verificationStatus}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    License: <span className="font-semibold text-slate-700">{prov.licenseNumber}</span> · {prov.specialty} ({prov.facilityType})
                  </p>
                  <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-slate-400">
                    <span>Pubkey: {prov.pubkey.slice(0, 8)}...{prov.pubkey.slice(-8)}</span>
                    <CopyButton text={prov.pubkey} label="" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {prov.verificationStatus !== "Verified" ? (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(prov.id, "Verified")}
                    disabled={updatingId === prov.id}
                    className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    {updatingId === prov.id ? "Updating..." : "Approve & Verify"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(prov.id, "Suspended")}
                    disabled={updatingId === prov.id}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                  >
                    {updatingId === prov.id ? "Updating..." : "Suspend License"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Audit Trail & Activity Filter */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Security Access & Compliance Log
            </h3>
            <p className="text-xs text-slate-500">
              Real-time audit log of document access requests, authorization checks, and security events.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {["ALL", "DOCUMENT_ACCESSED", "ACCESS_DENIED", "CONSENT_GRANTED", "RECORD_AMENDED", "PROVIDER_REFERRAL"].map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => setAuditFilter(action)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  auditFilter === action
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {action === "ALL" ? "All Logs" : action.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 text-xs">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white font-bold text-[10px] ${
                    log.success ? "bg-emerald-600" : "bg-rose-600"
                  }`}
                >
                  {log.success ? "✓" : "!"}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.action.replace(/_/g, " ")}</span>
                    <Badge variant={log.success ? "success" : "danger"}>
                      {log.actorRole}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-slate-600">{log.details}</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">
                    Actor: {log.actorPubkey.slice(0, 8)}...{log.actorPubkey.slice(-8)}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-slate-400 self-end sm:self-auto text-[11px] sm:text-xs">
                {new Date(log.timestamp * 1000).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Disaster Recovery Restore Modal */}
      <RestoreVaultModal
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
        onRestoreSuccess={onRefreshData}
      />
    </div>
  );
}
