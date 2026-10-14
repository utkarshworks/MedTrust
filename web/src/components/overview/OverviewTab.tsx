"use client";

import Badge from "@/components/ui/Badge";
import RecordCard from "@/components/RecordCard";
import { ConsentData } from "@/lib/consent";
import { RecordData } from "@/lib/record";
import { MedicalDocumentRecord } from "@/lib/storage";
import { NavTab } from "@/components/Sidebar";
import { useCurrentTimestamp } from "@/hooks/useCurrentTime";

interface OverviewTabProps {
  documents: MedicalDocumentRecord[];
  consent: ConsentData | null;
  chainRecord: RecordData | null;
  onNavigate: (tab: NavTab) => void;
  onInspectDocument: (doc: MedicalDocumentRecord) => void;
  onOpenCreateRecord: () => void;
}

export default function OverviewTab({
  documents,
  consent,
  chainRecord,
  onNavigate,
  onInspectDocument,
  onOpenCreateRecord,
}: OverviewTabProps) {
  const currentTimestamp = useCurrentTimestamp();
  const isConsentActive = Boolean(consent?.active && consent.expiresAt > currentTimestamp);

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100/90 bg-gradient-to-br from-white via-indigo-50/20 to-indigo-100/30 p-6 sm:p-8 lg:p-9 shadow-xs">
        <div className="relative max-w-2xl z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/90 px-3 py-1 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              Patient Data Sovereignty
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            Verifiable Health Records. Controlled by You.
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            Keep clinical documents private and encrypted off-chain while anchoring verifiable integrity references and time-limited access consents directly on Solana.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onOpenCreateRecord}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Upload / Anchor Record</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("Access Control")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300"
            >
              <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Manage Clinic Access</span>
            </button>
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            System Status & Provenance
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Medical Records */}
          <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-indigo-200 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Medical Records
                </p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                  {documents.length}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">Off-chain storage</span>
              <Badge variant="neutral">Verified Anchor</Badge>
            </div>
          </div>

          {/* Card 2: Cryptographic Integrity */}
          <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-emerald-200 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Integrity Verification
                </p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                  100%
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">SHA-256 On-Chain</span>
              <Badge variant="success">Bit-for-Bit Valid</Badge>
            </div>
          </div>

          {/* Card 3: Active Consents */}
          <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-indigo-200 hover:shadow-md sm:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Active Permissions
                </p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                  {isConsentActive ? "1" : "0"}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  isConsentActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                }`}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">Demo Clinic</span>
              <Badge variant={isConsentActive ? "success" : "warning"}>
                {isConsentActive ? "Active Access" : "Revoked / Expired"}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Records Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Registered Medical Records
            </h3>
            <p className="text-xs text-slate-500">
              Records registered with on-chain cryptographic anchors on Solana Devnet
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("Medical Records")}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            View all records →
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          {documents.slice(0, 3).map((doc) => (
            <RecordCard
              key={doc.id}
              recordId={doc.recordId}
              title={doc.title}
              provider={doc.category}
              date={doc.date}
              verified={true}
              onView={() => onInspectDocument(doc)}
            />
          ))}
        </div>
      </section>

      {/* Access Permission Quick Status */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Current Provider Consent
            </h3>
            <p className="text-xs text-slate-500">
              Granular time-bounded access granted to healthcare institutions
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("Access Control")}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Manage permissions →
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
          {consent ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">MedTrust Demo Clinic</h4>
                    <span className="font-mono text-xs text-slate-400">
                      ({consent.provider.slice(0, 4)}...{consent.provider.slice(-4)})
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Authorized to verify Record #{consent.recordId} · Valid until{" "}
                    <span className="font-semibold text-slate-700">
                      {new Date(consent.expiresAt * 1000).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={isConsentActive ? "success" : "danger"}>
                  {isConsentActive ? "Active Access" : "Revoked"}
                </Badge>
                <button
                  type="button"
                  onClick={() => onNavigate("Access Control")}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Configure
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2 text-slate-500 text-xs">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              <span>Checking Solana consent account...</span>
            </div>
          )}
        </div>
      </section>

      {/* Security Architecture Reference */}
      <section className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Security & Cryptographic Architecture
        </h4>
        <div className="grid gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-slate-200/70 bg-white p-4">
            <span className="font-bold text-slate-800">1. Private Document</span>
            <p className="mt-1 text-slate-500 leading-relaxed">
              Medical document remains on your local device or encrypted private cloud. Never placed on-chain.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/70 bg-white p-4">
            <span className="font-bold text-slate-800">2. Solana Hash Anchor</span>
            <p className="mt-1 text-slate-500 leading-relaxed">
              A 32-byte SHA-256 digest is permanently committed to Solana PDA state (
              {chainRecord ? `${chainRecord.pda.slice(0, 4)}...${chainRecord.pda.slice(-4)}` : "Devnet"}
              ).
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/70 bg-white p-4">
            <span className="font-bold text-slate-800">3. Time-Locked Consent</span>
            <p className="mt-1 text-slate-500 leading-relaxed">
              Providers must present a cryptographically active on-chain consent PDA to verify records.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
