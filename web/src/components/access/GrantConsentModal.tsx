"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { PublicKey } from "@solana/web3.js";
import { HealthcareProvider, MedicalDocumentRecord } from "@/lib/storage";

interface GrantConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGrant: (providerPubkey: string, recordId: number, durationSeconds: number) => Promise<void>;
  providers?: HealthcareProvider[];
  documents?: MedicalDocumentRecord[];
  defaultProvider?: string;
  defaultRecordId?: number;
  isProcessing: boolean;
}

const durationOptions = [
  { label: "1 Hour", seconds: 60 * 60, desc: "Quick consultation" },
  { label: "24 Hours", seconds: 24 * 60 * 60, desc: "Single day clinic visit" },
  { label: "7 Days", seconds: 7 * 24 * 60 * 60, desc: "Standard care episode" },
  { label: "30 Days", seconds: 30 * 24 * 60 * 60, desc: "Extended specialist care" },
];

export default function GrantConsentModal({
  isOpen,
  onClose,
  onGrant,
  providers = [],
  documents = [],
  defaultProvider = "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
  defaultRecordId = 1,
  isProcessing,
}: GrantConsentModalProps) {
  const [providerInput, setProviderInput] = useState(defaultProvider);
  const [selectedRecordId, setSelectedRecordId] = useState<number>(
    documents[0]?.recordId || defaultRecordId
  );
  const [selectedDuration, setSelectedDuration] = useState(7 * 24 * 60 * 60);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const trimmed = providerInput.trim();
    try {
      new PublicKey(trimmed);
    } catch {
      setValidationError("Please enter a valid 32-44 character base58 Solana public key.");
      return;
    }

    try {
      await onGrant(trimmed, selectedRecordId, selectedDuration);
      onClose();
    } catch (err) {
      console.error("Grant failed:", err);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Grant Record Access Permission"
      description="Authorize a healthcare provider to verify and retrieve your encrypted medical record on Solana."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Record Selection */}
        <div>
          <label htmlFor="grant-record-select" className="block text-xs font-bold text-slate-700">
            Target Medical Record
          </label>
          <select
            id="grant-record-select"
            value={selectedRecordId}
            onChange={(e) => setSelectedRecordId(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {documents.length > 0 ? (
              documents.map((doc) => (
                <option key={doc.id} value={doc.recordId}>
                  Record #{doc.recordId} — {doc.title} ({doc.category})
                </option>
              ))
            ) : (
              <option value={1}>Record #1 — Routine Checkup & Diagnostic Lab</option>
            )}
          </select>
        </div>

        {/* Provider Selection */}
        <div>
          <label htmlFor="provider-pubkey" className="block text-xs font-bold text-slate-700">
            Authorized Healthcare Provider
          </label>
          {providers.length > 0 && (
            <select
              value={providerInput}
              onChange={(e) => {
                setProviderInput(e.target.value);
                setValidationError(null);
              }}
              className="mt-1 mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.pubkey}>
                  {p.name} ({p.facilityType} · {p.specialty})
                </option>
              ))}
            </select>
          )}

          <div>
            <input
              id="provider-pubkey"
              type="text"
              value={providerInput}
              onChange={(e) => {
                setProviderInput(e.target.value);
                setValidationError(null);
              }}
              placeholder="Or paste provider wallet base58 pubkey..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          {validationError && (
            <p className="mt-1.5 text-xs text-rose-600 font-medium">{validationError}</p>
          )}
        </div>

        {/* Duration Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Access Duration (Time-To-Live)
          </label>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {durationOptions.map((opt) => {
              const isSelected = selectedDuration === opt.seconds;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setSelectedDuration(opt.seconds)}
                  className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/80 text-indigo-700 ring-2 ring-indigo-500/20 font-semibold shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-xs">{opt.label}</span>
                  <span className="mt-0.5 text-[10px] text-slate-400 leading-tight">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <svg className="h-4 w-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            </svg>
            Patient Sovereignty Guarantee
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            This permission is committed to Solana Devnet via a Program Derived Address (PDA). You can revoke access at any time with a single transaction.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Submitting to Solana...</span>
              </>
            ) : (
              <span>Confirm & Grant Access</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
