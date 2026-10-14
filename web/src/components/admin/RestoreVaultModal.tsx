"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

interface RestoreVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess: () => Promise<void>;
}

export default function RestoreVaultModal({
  isOpen,
  onClose,
  onRestoreSuccess,
}: RestoreVaultModalProps) {
  const { showToast, updateToast } = useToast();
  const [parsedData, setParsedData] = useState<{
    documentsCount: number;
    providersCount: number;
    payload: unknown;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const vault = json.vault || json;

        if (!vault.documents || !Array.isArray(vault.documents)) {
          throw new Error("Invalid MedTrust backup format: missing documents array.");
        }

        setParsedData({
          documentsCount: vault.documents.length,
          providersCount: Array.isArray(vault.providers) ? vault.providers.length : 0,
          payload: vault,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse backup JSON file");
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  }

  async function handleConfirmRestore() {
    if (!parsedData) return;

    const toastId = showToast({
      type: "loading",
      title: "Restoring MedTrust Vault...",
      message: "Reconstructing documents, cryptographic envelopes, and access logs",
      duration: 0,
    });

    try {
      setIsRestoring(true);

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-requester-role": "Admin",
        },
        body: JSON.stringify({
          vault: parsedData.payload,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to restore backup snapshot");
      }

      updateToast(toastId, {
        type: "success",
        title: "Vault Restored Successfully",
        message: `Restored ${data.restoredRecords} clinical documents and provider records.`,
        duration: 6000,
      });

      await onRestoreSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to restore backup";
      setError(msg);
      updateToast(toastId, {
        type: "error",
        title: "Restoration Failed",
        message: msg,
        duration: 5000,
      });
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Disaster Recovery & Vault Restore"
      description="Restore clinical records, cryptographic envelopes, and provider registries from an encrypted JSON backup bundle."
      maxWidth="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 font-semibold">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center bg-slate-50/50 hover:border-indigo-400 transition">
          <svg className="h-8 w-8 text-slate-400 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <label className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
            <span>Select MedTrust Backup JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <p className="mt-1 text-[11px] text-slate-400">
            Select a verified medtrust-vault-backup-*.json bundle
          </p>
        </div>

        {parsedData && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-2 text-xs">
            <h4 className="font-bold text-indigo-950">Verified Backup Contents:</h4>
            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Medical Documents</span>
                <span className="text-base font-extrabold text-slate-900">{parsedData.documentsCount}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Providers</span>
                <span className="text-base font-extrabold text-slate-900">{parsedData.providersCount}</span>
              </div>
            </div>
            <p className="text-[11px] text-indigo-800">
              Restoring will merge and reconstruct the local vault state. Integrity hashes will remain verifiable against Solana anchors.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmRestore}
            disabled={!parsedData || isRestoring}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isRestoring ? "Restoring Vault..." : "Confirm & Restore Vault"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

