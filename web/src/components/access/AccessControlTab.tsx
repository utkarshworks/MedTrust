"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import GrantConsentModal from "./GrantConsentModal";
import { ConsentData, grantConsent, revokeConsent, getConsentPda } from "@/lib/consent";
import { connection } from "@/lib/solana";
import { useCurrentTimestamp } from "@/hooks/useCurrentTime";
import { HealthcareProvider, MedicalDocumentRecord, ConsentRecord } from "@/lib/storage";

interface AccessControlTabProps {
  consent?: ConsentData | null;
  consents?: ConsentRecord[];
  documents?: MedicalDocumentRecord[];
  providers?: HealthcareProvider[];
  onRefreshConsent: () => Promise<void>;
  isLoading: boolean;
}

function formatRemainingTime(expiresAt: number, currentTimestamp: number): string {
  if (expiresAt <= currentTimestamp) return "Expired";
  const diff = expiresAt - currentTimestamp;
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export default function AccessControlTab({
  consent,
  consents = [],
  documents = [],
  providers = [],
  onRefreshConsent,
  isLoading,
}: AccessControlTabProps) {
  const currentTimestamp = useCurrentTimestamp();
  const { publicKey, sendTransaction } = useWallet();

  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [revokingPda, setRevokingPda] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
    tx?: string;
  } | null>(null);

  // Re-authorization prefill state
  const [reauthProvider, setReauthProvider] = useState<string | undefined>(undefined);
  const [reauthRecordId, setReauthRecordId] = useState<number | undefined>(undefined);

  // Normalize list of consents
  const effectiveConsents: ConsentRecord[] =
    consents.length > 0
      ? consents
      : consent
        ? [
            {
              pda: consent.pda,
              patientPubkey: consent.patient,
              providerPubkey: consent.provider,
              recordId: consent.recordId,
              recordTitle: documents.find((d) => d.recordId === consent.recordId)?.title || `Record #${consent.recordId}`,
              grantedAt: consent.grantedAt,
              expiresAt: consent.expiresAt,
              active: consent.active,
            },
          ]
        : [];

  // Metrics
  const activeCount = effectiveConsents.filter(
    (c) => c.active && c.expiresAt > currentTimestamp
  ).length;
  const inactiveCount = effectiveConsents.length - activeCount;

  // Search & Filter
  const filteredConsents = effectiveConsents.filter((c) => {
    const isAct = c.active && c.expiresAt > currentTimestamp;
    if (filter === "ACTIVE" && !isAct) return false;
    if (filter === "INACTIVE" && isAct) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchedProv = providers.find((p) => p.pubkey === c.providerPubkey);
      const provName = (matchedProv?.name || c.providerPubkey).toLowerCase();
      const recTitle = (c.recordTitle || `Record #${c.recordId}`).toLowerCase();
      return provName.includes(q) || recTitle.includes(q) || c.recordId.toString().includes(q);
    }
    return true;
  });

  async function handleGrant(providerPubkey: string, recordId: number, durationSeconds: number) {
    if (!publicKey) {
      setFeedback({
        type: "error",
        message: "Please connect your Solana wallet first.",
      });
      return;
    }

    try {
      setFeedback(null);
      const expiresAt = Math.floor(Date.now() / 1000) + durationSeconds;
      const provider = new PublicKey(providerPubkey);

      const signature = await grantConsent(
        publicKey,
        provider,
        recordId,
        expiresAt,
        sendTransaction
      );

      await connection.confirmTransaction(signature, "confirmed");

      const derivedPda = getConsentPda(publicKey, provider, recordId);
      const doc = documents.find((d) => d.recordId === recordId);

      // Persist consent to backend vault
      await fetch("/api/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pda: derivedPda.toBase58(),
          patientPubkey: publicKey.toBase58(),
          providerPubkey,
          recordId,
          recordTitle: doc?.title || `Record #${recordId}`,
          grantedAt: Math.floor(Date.now() / 1000),
          expiresAt,
          active: true,
          txHash: signature,
        }),
      });

      setFeedback({
        type: "success",
        message: "Access consent successfully granted on Solana Devnet!",
        tx: signature,
      });

      await onRefreshConsent();
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to grant consent on-chain.",
      });
    }
  }

  async function handleRevoke(targetConsent: ConsentRecord) {
    if (!publicKey) {
      setFeedback({
        type: "error",
        message: "Please connect your patient wallet to revoke access.",
      });
      return;
    }

    try {
      setRevokingPda(targetConsent.pda);
      setFeedback(null);

      const provider = new PublicKey(targetConsent.providerPubkey);

      const signature = await revokeConsent(
        publicKey,
        provider,
        targetConsent.recordId,
        sendTransaction
      );

      await connection.confirmTransaction(signature, "confirmed");

      // Update backend vault status
      await fetch("/api/consents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pda: targetConsent.pda,
          patientPubkey: publicKey.toBase58(),
          providerPubkey: targetConsent.providerPubkey,
          recordId: targetConsent.recordId,
          txHash: signature,
        }),
      });

      setFeedback({
        type: "success",
        message: `Access permission for Record #${targetConsent.recordId} revoked on Solana.`,
        tx: signature,
      });

      await onRefreshConsent();
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to revoke consent on-chain.",
      });
    } finally {
      setRevokingPda(null);
    }
  }

  function handleOpenReauthorize(target: ConsentRecord) {
    setReauthProvider(target.providerPubkey);
    setReauthRecordId(target.recordId);
    setIsGrantModalOpen(true);
  }

  function handleOpenNewGrant() {
    setReauthProvider(undefined);
    setReauthRecordId(undefined);
    setIsGrantModalOpen(true);
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-indigo-600">Permissions</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Consent & Access Control
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
            Authorize or revoke provider verification permissions. Consents are cryptographically signed by the patient and verifiable on-chain.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNewGrant}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>Grant New Permission</span>
        </button>
      </section>

      {/* Summary KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Authorizations
          </span>
          <p className="mt-1 text-2xl font-bold text-slate-900">{effectiveConsents.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">All registered provider consents</p>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4.5 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Active Consents
          </span>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{activeCount}</p>
          <p className="mt-0.5 text-xs text-emerald-700">Currently authorized for retrieval</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Revoked / Expired
          </span>
          <p className="mt-1 text-2xl font-bold text-slate-700">{inactiveCount}</p>
          <p className="mt-0.5 text-xs text-slate-500">Access physically blocked at boundary</p>
        </div>

        <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4.5 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
            Solana Verification
          </span>
          <p className="mt-1 text-2xl font-bold text-indigo-900">100% On-Chain</p>
          <p className="mt-0.5 text-xs text-indigo-700">Immutable Devnet Anchor PDAs</p>
        </div>
      </section>

      {/* Transaction Feedback Alert */}
      {feedback && (
        <div
          className={`rounded-2xl border p-4.5 transition-all shadow-xs ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  feedback.type === "success"
                    ? "bg-emerald-600 text-white"
                    : "bg-rose-600 text-white"
                }`}
              >
                {feedback.type === "success" ? "✓" : "!"}
              </span>
              <div>
                <p className="text-xs font-bold">{feedback.message}</p>
                {feedback.tx && (
                  <a
                    href={`https://explorer.solana.com/tx/${feedback.tx}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 font-mono text-xs font-semibold underline"
                  >
                    View Solana Transaction ({feedback.tx.slice(0, 8)}...) →
                  </a>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs opacity-60 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <section className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex w-full sm:w-auto items-center rounded-xl bg-slate-100 p-1 text-xs font-semibold shadow-2xs">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`flex-1 sm:flex-initial rounded-lg px-3 py-1.5 transition ${
              filter === "ALL" ? "bg-white text-indigo-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Permissions ({effectiveConsents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("ACTIVE")}
            className={`flex-1 sm:flex-initial rounded-lg px-3 py-1.5 transition ${
              filter === "ACTIVE" ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("INACTIVE")}
            className={`flex-1 sm:flex-initial rounded-lg px-3 py-1.5 transition ${
              filter === "INACTIVE" ? "bg-white text-slate-800 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Expired / Revoked ({inactiveCount})
          </button>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search provider or record..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
          />
        </div>
      </section>

      {/* Permissions List */}
      <section className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <p className="text-sm text-slate-500">Querying on-chain permissions from Solana Devnet...</p>
          </div>
        ) : filteredConsents.length > 0 ? (
          <div className="space-y-4">
            {filteredConsents.map((item) => {
              const matchedProvider = providers.find((p) => p.pubkey === item.providerPubkey);
              const matchedRecord = documents.find((d) => d.recordId === item.recordId);
              const isAct = item.active && item.expiresAt > currentTimestamp;
              const isExpired = item.active && item.expiresAt <= currentTimestamp;
              const isRevokingThis = revokingPda === item.pda;

              return (
                <div
                  key={item.pda}
                  className={`rounded-2xl border transition bg-white shadow-2xs overflow-hidden ${
                    isAct ? "border-slate-200/90 hover:border-indigo-300" : "border-slate-200/60 opacity-85"
                  }`}
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base shadow-2xs ${
                            isAct
                              ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {matchedProvider?.facilityType === "Hospital"
                            ? "🏥"
                            : matchedProvider?.facilityType === "Laboratory"
                              ? "🔬"
                              : "🩺"}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">
                              {matchedProvider ? matchedProvider.name : `Provider (${item.providerPubkey.slice(0, 6)}...)`}
                            </h4>

                            {isAct ? (
                              <Badge variant="success">
                                Active · {formatRemainingTime(item.expiresAt, currentTimestamp)}
                              </Badge>
                            ) : isExpired ? (
                              <Badge variant="warning">Access Expired</Badge>
                            ) : (
                              <Badge variant="danger">Revoked by Patient</Badge>
                            )}

                            {matchedProvider?.verificationStatus === "Verified" && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                Verified Practice
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            {matchedProvider ? `${matchedProvider.specialty} · License #${matchedProvider.licenseNumber}` : "Registered Healthcare Practitioner"}
                          </p>

                          <p className="mt-1 text-xs text-slate-700">
                            Scope: <strong className="font-semibold">{item.recordTitle || (matchedRecord ? matchedRecord.title : `Record #${item.recordId}`)}</strong>
                            {matchedRecord && <span className="ml-1 text-slate-400">({matchedRecord.category})</span>}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {isAct ? (
                          <button
                            type="button"
                            onClick={() => handleRevoke(item)}
                            disabled={isRevokingThis}
                            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50 shadow-2xs"
                          >
                            {isRevokingThis ? (
                              <>
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-rose-300 border-t-rose-700" />
                                <span>Revoking...</span>
                              </>
                            ) : (
                              <>
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="15" y1="9" x2="9" y2="15" />
                                  <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                                <span>Revoke Access</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenReauthorize(item)}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                            <span>Re-Authorize</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
                      <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Provider Pubkey
                          </span>
                          <CopyButton text={item.providerPubkey} />
                        </div>
                        <p className="mt-0.5 font-mono text-slate-700 truncate">
                          {item.providerPubkey.slice(0, 6)}...{item.providerPubkey.slice(-6)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Granted Date
                        </span>
                        <p className="mt-0.5 font-semibold text-slate-700">
                          {new Date(item.grantedAt * 1000).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Expiration Timestamp
                        </span>
                        <p className="mt-0.5 font-semibold text-slate-700">
                          {new Date(item.expiresAt * 1000).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Solana Consent PDA Anchor Bar */}
                    <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Consent PDA:</span>
                        <span className="font-mono text-slate-700 font-semibold">{item.pda.slice(0, 8)}...{item.pda.slice(-8)}</span>
                        <CopyButton text={item.pda} />
                      </div>

                      <a
                        href={`https://explorer.solana.com/address/${item.pda}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        View on Solana Explorer →
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Consents Found</h4>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No permissions matched "${searchQuery}". Try clearing search filter.`
                : "No provider permissions have been granted yet. Grant access to authorize clinical retrieval."}
            </p>
            <button
              type="button"
              onClick={handleOpenNewGrant}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs"
            >
              <span>Grant New Permission</span>
            </button>
          </div>
        )}
      </section>

      {/* Grant Consent Modal */}
      <GrantConsentModal
        isOpen={isGrantModalOpen}
        onClose={() => setIsGrantModalOpen(false)}
        onGrant={handleGrant}
        providers={providers}
        documents={documents}
        defaultProvider={reauthProvider || consent?.provider}
        defaultRecordId={reauthRecordId || consent?.recordId}
        isProcessing={false}
      />
    </div>
  );
}
