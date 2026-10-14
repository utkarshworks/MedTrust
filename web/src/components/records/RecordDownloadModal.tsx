"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import { MedicalDocumentRecord } from "@/lib/storage";
import { convertToFhirBundle } from "@/lib/fhir";

interface RecordDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: MedicalDocumentRecord | null;
  onOpenAmendment?: (doc: MedicalDocumentRecord) => void;
}

export default function RecordDownloadModal({
  isOpen,
  onClose,
  document,
  onOpenAmendment,
}: RecordDownloadModalProps) {
  const [lineage, setLineage] = useState<MedicalDocumentRecord[]>([]);

  useEffect(() => {
    let ignore = false;
    if (!document) return;

    fetch(`/api/documents/${document.id}`, {
      headers: {
        "x-requester-pubkey": document.patientPubkey,
        "x-requester-role": "Patient",
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!ignore && data.success && data.lineage) {
          setLineage(data.lineage);
        }
      })
      .catch((err) => console.warn("Failed to fetch record lineage:", err));

    return () => {
      ignore = true;
    };
  }, [document]);

  if (!document) return null;

  function handleDownloadDecrypted() {
    if (!document) return;
    const blob = new Blob([document.plaintextPreview], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${document.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-decrypted.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadBundle() {
    if (!document) return;
    const bundle = {
      standard: "MedTrust-v1",
      recordId: document.recordId,
      pda: document.pda,
      version: document.version,
      parentRecordId: document.parentRecordId,
      parentHash: document.parentHash,
      amendmentReason: document.amendmentReason,
      sha256Hash: document.envelope.sha256Hash,
      patientPubkey: document.patientPubkey,
      providerPubkey: document.providerPubkey,
      createdAt: document.createdAt,
      envelope: document.envelope,
      lineageLength: lineage.length,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `medtrust-proof-record-${document.recordId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadFhir() {
    if (!document) return;
    const fhirBundle = convertToFhirBundle(document);
    const blob = new Blob([JSON.stringify(fhirBundle, null, 2)], {
      type: "application/fhir+json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${document.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-fhir-r4.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={document.title}
      description={`Record #${document.recordId} · Category: ${document.category}`}
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Verification Status */}
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
              ✓
            </span>
            <span className="text-xs font-bold text-emerald-900">
              Integrity Verified on Solana Devnet
            </span>
          </div>
          <Badge variant="success">Version {document.version}</Badge>
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Record ID
            </span>
            <p className="mt-0.5 font-mono font-semibold text-slate-800">#{document.recordId}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Date
            </span>
            <p className="mt-0.5 font-semibold text-slate-800">{document.date}</p>
          </div>
        </div>

        {/* Hashes & PDA */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Solana PDA Anchor
              </span>
              <CopyButton text={document.pda} label="Copy" />
            </div>
            <p className="break-all font-mono text-xs text-slate-700 bg-white p-2 rounded border border-slate-200">
              {document.pda}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                SHA-256 Digest
              </span>
              <CopyButton text={document.envelope?.sha256Hash || ""} label="Copy" />
            </div>
            <p className="break-all font-mono text-xs text-slate-700 bg-white p-2 rounded border border-slate-200">
              {document.envelope?.sha256Hash || "Not Anchored"}
            </p>
          </div>
        </div>

        {/* Version History Lineage Chain */}
        {lineage.length > 1 && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">
                Audit Lineage & Version History ({lineage.length} revisions)
              </span>
              <span className="text-[10px] font-semibold text-indigo-600">Preserved On-Chain</span>
            </div>
            <div className="space-y-1.5">
              {lineage.map((v) => {
                const vHash = v.envelope?.sha256Hash || (v as unknown as { sha256Hash?: string }).sha256Hash || "";
                return (
                  <div
                    key={v.id}
                    className={`flex items-center justify-between rounded-lg p-2 text-xs border ${
                      v.id === document.id
                        ? "bg-white border-indigo-300 font-bold text-indigo-950 shadow-xs"
                        : "bg-slate-50/80 border-slate-200/80 text-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800">
                        v{v.version}
                      </span>
                      <span className="truncate max-w-[200px]">{v.title}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                      <span>{v.date}</span>
                      {vHash && (
                        <>
                          <span>•</span>
                          <span>{vHash.slice(0, 6)}...</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Clinical Document Preview */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Decrypted Clinical Document Content
          </label>
          <pre className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs leading-relaxed text-slate-800">
            {document.plaintextPreview}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <a
            href={`https://explorer.solana.com/address/${document.pda}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Inspect PDA on Solana Explorer →
          </a>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenAmendment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAmendment(document);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition shadow-xs"
              >
                <svg className="h-3.5 w-3.5 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Amend Record</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadFhir}
              className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
            >
              Export FHIR R4 (.json)
            </button>
            <button
              type="button"
              onClick={handleDownloadBundle}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Export JSON Proof
            </button>
            <button
              type="button"
              onClick={handleDownloadDecrypted}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
            >
              Download (.txt)
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
