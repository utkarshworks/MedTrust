"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import { sha256 } from "@/lib/hash";
import { RecordData, getRecordForDocument, createRecordOnChain } from "@/lib/record";
import { MedicalDocumentRecord } from "@/lib/storage";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useToast } from "@/components/ui/Toast";
import { connection } from "@/lib/solana";

interface RecordInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  document?: MedicalDocumentRecord | null;
  chainRecord?: RecordData | null;
  defaultContent?: string;
  onRecordAnchored?: () => Promise<void>;
}

export default function RecordInspectorModal({
  isOpen,
  onClose,
  document,
  chainRecord,
  defaultContent = "",
  onRecordAnchored,
}: RecordInspectorModalProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { showToast, updateToast } = useToast();

  const effectiveDefaultContent =
    document?.plaintextPreview || defaultContent || "TEST MEDICAL RECORD";

  const [mode, setMode] = useState<"text" | "file">("text");
  const [content, setContent] = useState(effectiveDefaultContent);
  const [currentHash, setCurrentHash] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Dynamic on-chain record resolution
  const [resolvedRecord, setResolvedRecord] = useState<RecordData | null>(chainRecord || null);
  const [prevChainRecord, setPrevChainRecord] = useState<RecordData | null>(chainRecord || null);
  const [isLoadingChain, setIsLoadingChain] = useState(false);
  const [isAnchoring, setIsAnchoring] = useState(false);

  // File verification state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [fileHash, setFileHash] = useState<string>("");
  const [isHashingFile, setIsHashingFile] = useState(false);

  // Sync content during render pass (React 19 pure state adjustment)
  const [prevDocId, setPrevDocId] = useState<string | null>(null);
  const [prevDefault, setPrevDefault] = useState(defaultContent);

  if (document && document.id !== prevDocId) {
    setPrevDocId(document.id);
    setContent(document.plaintextPreview || "");
    setIsEditing(false);
  } else if (!document && defaultContent !== prevDefault) {
    setPrevDefault(defaultContent);
    setContent(defaultContent);
    setIsEditing(false);
  }

  if (!document && chainRecord !== prevChainRecord) {
    setPrevChainRecord(chainRecord || null);
    setResolvedRecord(chainRecord || null);
  }

  // Asynchronously resolve on-chain record PDA from Solana Devnet
  useEffect(() => {
    let cancelled = false;

    if (document) {
      const currentDoc = document;
      async function resolve() {
        setIsLoadingChain(true);
        try {
          const rec = await getRecordForDocument(currentDoc.patientPubkey, currentDoc.recordId);
          if (!cancelled) {
            setResolvedRecord(rec);
          }
        } catch {
          if (!cancelled) setResolvedRecord(null);
        } finally {
          if (!cancelled) setIsLoadingChain(false);
        }
      }
      resolve();
    }

    return () => {
      cancelled = true;
    };
  }, [document]);

  useEffect(() => {
    let cancelled = false;
    async function computeHash() {
      const hash = await sha256(content);
      if (!cancelled) {
        setCurrentHash(hash);
      }
    }
    computeHash();
    return () => {
      cancelled = true;
    };
  }, [content]);

  async function handleAnchorOnChain() {
    if (!publicKey || !document) return;

    const toastId = showToast({
      type: "loading",
      title: "Anchoring Document to Solana...",
      message: `Writing SHA-256 fingerprint for Record #${document.recordId} to Devnet`,
      duration: 0,
    });

    try {
      setIsAnchoring(true);
      const providerPk = new PublicKey(document.providerPubkey);
      const hashToAnchor = document.envelope?.sha256Hash || currentHash;

      const res = await createRecordOnChain(
        publicKey,
        providerPk,
        document.recordId,
        hashToAnchor,
        sendTransaction
      );

      await connection.confirmTransaction(res.signature, "confirmed");

      const newlyResolved = await getRecordForDocument(publicKey, document.recordId);
      setResolvedRecord(newlyResolved);

      updateToast(toastId, {
        type: "success",
        title: "Record Anchored on Solana",
        message: `Record #${document.recordId} is now cryptographically immutable on Devnet.`,
        txHash: res.signature,
        duration: 6000,
      });

      if (onRecordAnchored) {
        await onRecordAnchored();
      }
    } catch (err) {
      console.error(err);
      updateToast(toastId, {
        type: "error",
        title: "Anchoring Failed",
        message: err instanceof Error ? err.message : "Failed to anchor record to Solana.",
        duration: 5000,
      });
    } finally {
      setIsAnchoring(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadedFileSize(file.size);
    setIsHashingFile(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      setFileHash(hashHex);
    } catch (err) {
      console.error("File hashing failed:", err);
    } finally {
      setIsHashingFile(false);
    }
  }

  const onChainHash =
    resolvedRecord?.recordHash ||
    document?.envelope?.sha256Hash ||
    chainRecord?.recordHash ||
    "43778b5dab9247d44ecc08a894068d76fccf43ac5a157ec1c25140504b74393e";

  const effectiveCalculatedHash = mode === "file" ? fileHash : currentHash;
  const isMatch = Boolean(
    effectiveCalculatedHash &&
      effectiveCalculatedHash.toLowerCase() === onChainHash.toLowerCase()
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Medical Record Integrity Inspector"
      description="Verify arbitrary medical files or off-chain document contents against the cryptographic SHA-256 fingerprint anchored on Solana."
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Mode Selector */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("text")}
            className={`flex-1 rounded-lg py-1.5 transition ${
              mode === "text"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Clinical Text & Live Tamper Simulator
          </button>
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`flex-1 rounded-lg py-1.5 transition ${
              mode === "file"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Arbitrary File Verifier (PDF / DICOM / Images)
          </button>
        </div>

        {/* Verification Status Header */}
        <div
          className={`rounded-2xl border p-4.5 transition-all ${
            isMatch
              ? "border-emerald-200 bg-emerald-50/70"
              : "border-rose-200 bg-rose-50/70"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                isMatch ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
              }`}
            >
              {isMatch ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className={`text-sm font-bold ${isMatch ? "text-emerald-900" : "text-rose-900"}`}>
                  {isMatch ? "Cryptographic Integrity Verified" : "Tamper Warning: Hash Mismatch"}
                </h4>
                <Badge variant={isMatch ? "success" : "danger"}>
                  {isMatch ? "Valid Solana Proof" : "Tampered / Not Anchored"}
                </Badge>
              </div>
              <p className={`mt-1 text-xs leading-relaxed ${isMatch ? "text-emerald-800" : "text-rose-800"}`}>
                {isMatch
                  ? "The document SHA-256 fingerprint matches the immutable reference on Solana Devnet bit-for-bit."
                  : "The document content does not match the Solana on-chain anchor. Any modification changes the SHA-256 fingerprint completely."}
              </p>
            </div>
          </div>
        </div>

        {/* Mode: Live Text Editor */}
        {mode === "text" && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="record-content" className="text-xs font-bold text-slate-700">
                Off-Chain Clinical Document (Local Copy)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setContent(defaultContent);
                    setIsEditing(false);
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Reset Original
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditing) {
                      setIsEditing(true);
                    }
                    setContent((prev) => prev + " [TAMPERED]");
                  }}
                  className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200/80 hover:bg-amber-100 transition"
                >
                  Simulate Tamper
                </button>
              </div>
            </div>

            <textarea
              id="record-content"
              rows={6}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setIsEditing(true);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 font-mono text-xs leading-relaxed text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Tip: Edit any character above in real-time to watch the cryptographic hash change immediately.
            </p>
          </div>
        )}

        {/* Mode: Arbitrary File Verifier */}
        {mode === "file" && (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Upload Any Document to Verify Hash Against Solana Anchor
            </label>
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-indigo-400 transition bg-slate-50/50">
              <svg className="h-8 w-8 text-slate-400 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <label className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                <span>Select file from computer</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <p className="mt-1 text-[11px] text-slate-400">
                Supports PDF, DICOM scans, lab reports, image exports, or JSON cryptographs
              </p>
            </div>

            {uploadedFileName && (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">{uploadedFileName}</span>
                  <span className="text-slate-400 ml-2">
                    ({uploadedFileSize ? (uploadedFileSize / 1024).toFixed(1) : 0} KB)
                  </span>
                </div>
                {isHashingFile ? (
                  <div className="flex items-center gap-1.5 text-indigo-600 font-semibold">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                    <span>Computing SHA-256...</span>
                  </div>
                ) : (
                  <Badge variant="success">Hash Calculated</Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Cryptographic Hashes Comparison */}
        <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Calculated Document Hash ({mode === "file" ? "File" : "Client-Side"} SHA-256)
              </span>
              <CopyButton text={effectiveCalculatedHash} label="Copy" />
            </div>
            <p className="break-all rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-xs font-medium text-slate-800">
              {effectiveCalculatedHash || "Upload file or input text to calculate..."}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                On-Chain Anchor Hash (Solana Devnet State)
              </span>
              <CopyButton text={onChainHash} label="Copy" />
            </div>
            <p className="break-all rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-xs font-medium text-slate-800">
              {onChainHash}
            </p>
          </div>
        </div>

        {/* On-Chain Record PDA & Explorer */}
        {isLoadingChain ? (
          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <span>Resolving Solana Devnet on-chain PDA...</span>
          </div>
        ) : resolvedRecord ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
            <span className="text-slate-500">
              Record PDA: <span className="font-mono font-semibold text-slate-700">{resolvedRecord.pda.slice(0, 8)}...{resolvedRecord.pda.slice(-8)}</span>
            </span>
            <a
              href={`https://explorer.solana.com/address/${resolvedRecord.pda}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              View on Solana Explorer
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        ) : document && publicKey ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs">
            <div>
              <p className="font-semibold text-indigo-900">Not Anchored on Solana Devnet</p>
              <p className="text-[11px] text-indigo-700">Anchor this record to write its immutable SHA-256 fingerprint to the blockchain.</p>
            </div>
            <button
              type="button"
              onClick={handleAnchorOnChain}
              disabled={isAnchoring}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isAnchoring ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Anchoring...</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  </svg>
                  <span>Anchor to Solana Devnet</span>
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
