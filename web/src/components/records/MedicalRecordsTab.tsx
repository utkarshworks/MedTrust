"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import RestoreVaultModal from "@/components/admin/RestoreVaultModal";
import { MedicalDocumentRecord } from "@/lib/storage";

interface MedicalRecordsTabProps {
  documents: MedicalDocumentRecord[];
  onOpenCreateRecord: () => void;
  onInspectDocument: (doc: MedicalDocumentRecord) => void;
  onDownloadDocument: (doc: MedicalDocumentRecord) => void;
  onOpenAmendment?: (doc: MedicalDocumentRecord) => void;
  onRefreshData?: () => Promise<void>;
  isLoading: boolean;
}

export default function MedicalRecordsTab({
  documents,
  onOpenCreateRecord,
  onInspectDocument,
  onDownloadDocument,
  onOpenAmendment,
  onRefreshData,
  isLoading,
}: MedicalRecordsTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [simulateTamper, setSimulateTamper] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);

  const categories = [
    "All",
    "Clinical Note",
    "Lab Report",
    "Prescription",
    "Diagnostic Imaging",
    "Discharge Summary",
  ];

  const filtered = documents.filter((doc) => {
    const matchesCategory =
      selectedCategory === "All" || doc.category === selectedCategory;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  async function handleExportVault() {
    try {
      setIsExporting(true);
      const res = await fetch("/api/backup");
      const data = await res.json();
      if (data.success) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `medtrust-vault-backup-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Backup export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header section */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-indigo-600">Integrity Verification</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Medical Records Vault
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
            Encrypted off-chain medical documents anchored to immutable SHA-256 cryptographic hashes on Solana Devnet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportVault}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
          >
            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{isExporting ? "Exporting..." : "Export Vault Backup"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRestoreOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Restore Backup</span>
          </button>

          <button
            type="button"
            onClick={() => setSimulateTamper((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition shadow-xs ${
              simulateTamper
                ? "border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {simulateTamper ? (
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              ) : (
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              )}
            </svg>
            <span>{simulateTamper ? "Reset Simulation" : "Test Tamper Simulation"}</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateRecord}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Create / Upload Record</span>
          </button>
        </div>
      </section>

      {/* Tamper Warning Banner if enabled */}
      {simulateTamper && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">
              ✕
            </span>
            <div>
              <h4 className="text-sm font-bold text-rose-950">
                Tampering Simulation Active
              </h4>
              <p className="mt-0.5 text-xs text-rose-800 leading-relaxed">
                A single simulated byte modification has been introduced in client verification calculations. Notice how the SHA-256 fingerprint changes completely and verification against the Solana anchor fails immediately.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search records..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 pl-8 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
      </div>

      {/* Documents Grid / List */}
      <section className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <p className="text-sm text-slate-500">Loading encrypted records from MedTrust Vault...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            <p className="text-sm font-bold text-slate-800">No medical records match your criteria</p>
            <p className="mt-1 text-xs text-slate-400">Upload a new document or adjust filters.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs divide-y divide-slate-100">
            {filtered.map((doc) => {
              const isMatch = !simulateTamper;

              return (
                <div
                  key={doc.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20 shadow-xs">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                        <path d="M12 18v-6" />
                        <path d="M9 15h6" />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {doc.title}
                        </h4>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                          #{doc.recordId}
                        </span>
                        {doc.parentRecordId && (
                          <span className="rounded bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            Amend of #{doc.parentRecordId}
                          </span>
                        )}
                      </div>

                      {(() => {
                        const hash = doc.envelope?.sha256Hash || (doc as unknown as { sha256Hash?: string }).sha256Hash || "";
                        return (
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                            <span className="font-medium text-slate-700">{doc.category}</span>
                            <span>•</span>
                            <span>{doc.date}</span>
                            {hash ? (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[11px] text-slate-400">
                                  {hash.slice(0, 6)}...{hash.slice(-6)}
                                </span>
                                <CopyButton text={hash} label="" />
                              </>
                            ) : null}
                          </div>
                        );
                      })()}

                      <div className="mt-2.5 flex items-center gap-2">
                        <Badge variant={isMatch ? "success" : "danger"}>
                          {isMatch ? "Solana Anchor Verified" : "Tamper Mismatch"}
                        </Badge>
                        <span className="text-[11px] font-semibold text-slate-500">
                          Version {doc.version}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0 pt-2 sm:pt-0">
                    {onOpenAmendment && (
                      <button
                        type="button"
                        onClick={() => onOpenAmendment(doc)}
                        className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition shadow-xs"
                      >
                        Amend
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDownloadDocument(doc)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                    >
                      Download & Details
                    </button>
                    <button
                      type="button"
                      onClick={() => onInspectDocument(doc)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                    >
                      <span>Inspect Proof</span>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Disaster Recovery Restore Modal */}
      <RestoreVaultModal
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
        onRestoreSuccess={onRefreshData || (async () => {})}
      />
    </div>
  );
}
