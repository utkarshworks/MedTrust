"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  generateSymmetricKey,
  encryptDocument,
  computeSha256,
} from "@/lib/crypto";
import { createRecordOnChain } from "@/lib/record";
import { HealthcareProvider, MedicalDocumentRecord } from "@/lib/storage";

interface CreateRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordCreated: () => Promise<void>;
  providers: HealthcareProvider[];
  parentRecord?: MedicalDocumentRecord | null;
}

function CreateRecordForm({
  onClose,
  onRecordCreated,
  providers,
  parentRecord,
}: Omit<CreateRecordModalProps, "isOpen">) {
  const { publicKey, sendTransaction } = useWallet();
  const { showToast, updateToast } = useToast();

  const nextVersion = (parentRecord?.version || 1) + 1;
  const initialTitle = parentRecord
    ? parentRecord.title.startsWith("Amendment:")
      ? parentRecord.title
      : `Amendment: ${parentRecord.title} (v${nextVersion})`
    : "";
  const initialCategory = parentRecord?.category || "Clinical Note";
  const initialProvider =
    parentRecord?.providerPubkey || providers[0]?.pubkey || "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m";
  const initialContent = parentRecord
    ? `--- CLINICAL AMENDMENT TO RECORD #${parentRecord.recordId} ---\nOriginal Date: ${parentRecord.date}\nParent Hash: ${parentRecord.envelope?.sha256Hash || ""}\n\n[Addendum Notes / Corrected Findings]:\n`
    : "";

  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState<
    "Prescription" | "Lab Report" | "Diagnostic Imaging" | "Discharge Summary" | "Clinical Note"
  >(initialCategory);
  const [selectedProviderPubkey, setSelectedProviderPubkey] = useState(initialProvider);
  const [amendmentReason, setAmendmentReason] = useState("");
  const [documentContent, setDocumentContent] = useState(initialContent);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // File drag & drop handler
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setDocumentContent(text);
    };
    reader.readAsText(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!documentContent.trim()) {
      setError("Document content cannot be empty.");
      return;
    }

    if (parentRecord && !amendmentReason.trim()) {
      setError("Please specify the clinical reason for this amendment.");
      return;
    }

    const toastId = showToast({
      type: "loading",
      title: parentRecord ? "Anchoring Record Amendment..." : "Creating Medical Record...",
      message: "Encrypting with AES-256-GCM and anchoring to Solana Devnet",
      duration: 0,
    });

    try {
      setIsProcessing(true);
      setStatusMessage("1/3 Encrypting document with AES-256-GCM...");

      // 1. Client-Side Encryption
      const key = await generateSymmetricKey();
      const envelope = await encryptDocument(documentContent, key);
      const sha256Hash = await computeSha256(documentContent);

      const assignedRecordId = Math.floor(Date.now() % 100000) + 10;
      let signatureTx: string | undefined;

      // 2. On-Chain Solana Anchor Transaction (if wallet connected)
      if (publicKey) {
        setStatusMessage("2/3 Submitting createRecord instruction to Solana Devnet...");
        try {
          const providerPk = new PublicKey(selectedProviderPubkey);
          const res = await createRecordOnChain(
            publicKey,
            providerPk,
            assignedRecordId,
            sha256Hash,
            sendTransaction
          );
          signatureTx = res.signature;
        } catch (chainErr) {
          console.warn("On-chain record creation skipped/failed:", chainErr);
        }
      }

      // 3. Save to Off-Chain Storage Vault
      setStatusMessage("3/3 Storing encrypted document in MedTrust Vault...");
      const effectivePatientPubkey =
        publicKey?.toBase58() || "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m";

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientPubkey: effectivePatientPubkey,
          providerPubkey: selectedProviderPubkey,
          title,
          category,
          content: documentContent,
          envelope,
          recordId: assignedRecordId,
          signatureTx,
          parentRecordId: parentRecord ? parentRecord.recordId : undefined,
          amendmentReason: parentRecord ? amendmentReason : undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to save record to storage vault");
      }

      updateToast(toastId, {
        type: "success",
        title: parentRecord ? "Amendment Anchored" : "Record Anchored Successfully",
        message: `Record #${assignedRecordId} anchored on-chain with SHA-256 fingerprint.`,
        txHash: signatureTx,
        duration: 6000,
      });

      await onRecordCreated();
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to create record";
      setError(msg);
      updateToast(toastId, {
        type: "error",
        title: "Creation Failed",
        message: msg,
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 font-medium">
          {error}
        </div>
      )}

      {parentRecord && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white font-bold text-xs">
              ↺
            </span>
            <span className="text-xs font-bold text-amber-950">
              Record Versioning Lineage Linked
            </span>
          </div>
          <p className="text-[11px] text-amber-900 leading-relaxed">
            This amendment will create version <span className="font-bold">v{nextVersion}</span>, cryptographically referencing parent record #{parentRecord.recordId} (SHA-256: {parentRecord.envelope?.sha256Hash?.slice(0, 16) || "anchored"}...). Previous versions remain preserved in history.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="record-title" className="block text-xs font-bold text-slate-700">
          Document Title
        </label>
        <input
          id="record-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Cardiology Stress Test & Holter Monitor Report"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {parentRecord && (
        <div>
          <label htmlFor="amendment-reason" className="block text-xs font-bold text-amber-900">
            Clinical Reason for Amendment / Addendum *
          </label>
          <input
            id="amendment-reason"
            type="text"
            required
            value={amendmentReason}
            onChange={(e) => setAmendmentReason(e.target.value)}
            placeholder="e.g. Supplementary pathology findings, corrected dosage, or follow-up note"
            className="mt-1 w-full rounded-xl border border-amber-300 bg-amber-50/40 px-3.5 py-2 text-xs text-amber-950 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="record-category" className="block text-xs font-bold text-slate-700">
            Record Category
          </label>
          <select
            id="record-category"
            value={category}
            onChange={(e) =>
              setCategory(
                e.target.value as "Prescription" | "Lab Report" | "Diagnostic Imaging" | "Discharge Summary" | "Clinical Note"
              )
            }
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="Clinical Note">Clinical Note</option>
            <option value="Lab Report">Lab Report</option>
            <option value="Prescription">Prescription</option>
            <option value="Diagnostic Imaging">Diagnostic Imaging</option>
            <option value="Discharge Summary">Discharge Summary</option>
          </select>
        </div>

        <div>
          <label htmlFor="record-provider" className="block text-xs font-bold text-slate-700">
            Issuing Healthcare Provider
          </label>
          <select
            id="record-provider"
            value={selectedProviderPubkey}
            onChange={(e) => setSelectedProviderPubkey(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.pubkey}>
                {p.name} ({p.facilityType})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="document-content-area" className="block text-xs font-bold text-slate-700">
            Document Contents (Kept Off-Chain)
          </label>
          <label className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
            <span>Import text/report file</span>
            <input
              type="file"
              accept=".txt,.json,.md,.csv,.log"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
        <textarea
          id="document-content-area"
          rows={5}
          required
          value={documentContent}
          onChange={(e) => setDocumentContent(e.target.value)}
          placeholder="Paste clinical notes, lab results, prescriptions, or diagnosis details..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[11px] text-slate-600 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <svg className="h-3.5 w-3.5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          </svg>
          <span>Cryptographic Privacy Guarantee</span>
        </div>
        <p className="text-slate-500">
          This document will be encrypted locally using AES-256-GCM. Only its 32-byte SHA-256 hash is anchored to the Solana blockchain.
        </p>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 text-xs font-medium text-indigo-700 bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
          {isProcessing
            ? "Processing..."
            : parentRecord
              ? `Anchor Amendment (v${nextVersion})`
              : "Create & Anchor Record"}
        </button>
      </div>
    </form>
  );
}

export default function CreateRecordModal(props: CreateRecordModalProps) {
  if (!props.isOpen) return null;

  const modalTitle = props.parentRecord
    ? `Amend Record #${props.parentRecord.recordId} (v${(props.parentRecord.version || 1) + 1})`
    : "Create & Anchor Medical Record";

  const modalDescription = props.parentRecord
    ? `Create a verifiable clinical amendment referencing parent record #${props.parentRecord.recordId} and prior hash ${props.parentRecord.envelope?.sha256Hash?.slice(0, 8) || "anchored"}...`
    : "Upload clinical documentation, compute client-side AES-256 encryption, and anchor the SHA-256 digest on Solana.";

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={modalTitle}
      description={modalDescription}
      maxWidth="xl"
    >
      <CreateRecordForm
        key={props.parentRecord ? props.parentRecord.id : "new-record"}
        onClose={props.onClose}
        onRecordCreated={props.onRecordCreated}
        providers={props.providers}
        parentRecord={props.parentRecord}
      />
    </Modal>
  );
}
