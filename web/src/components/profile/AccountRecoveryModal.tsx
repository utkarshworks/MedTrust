"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import CopyButton from "@/components/ui/CopyButton";
import { useToast } from "@/components/ui/Toast";

interface AccountRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletPubkey: string;
  onRecoverySuccess: () => Promise<void>;
}

export default function AccountRecoveryModal({
  isOpen,
  onClose,
  walletPubkey,
  onRecoverySuccess,
}: AccountRecoveryModalProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<"generate" | "recover" | "guardian">("generate");

  // Generate phrase state
  const [generatedPhrase, setGeneratedPhrase] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Recovery state
  const [oldAddressInput, setOldAddressInput] = useState("");
  const [newAddressInput, setNewAddressInput] = useState(walletPubkey);
  const [phraseInput, setPhraseInput] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);

  // Guardian state
  const [guardianInput, setGuardianInput] = useState("");
  const [isSavingGuardian, setIsSavingGuardian] = useState(false);

  async function handleGeneratePhrase() {
    try {
      setIsGenerating(true);
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_phrase", pubkey: walletPubkey }),
      });
      const data = await res.json();
      if (data.success && data.phrase) {
        setGeneratedPhrase(data.phrase);
        showToast({
          type: "success",
          title: "Recovery Phrase Generated",
          message: "Store these 12 words in a secure, confidential place.",
          duration: 5000,
        });
      } else {
        throw new Error(data.error || "Failed to generate phrase");
      }
    } catch (err) {
      console.error(err);
      showToast({
        type: "error",
        title: "Generation Failed",
        message: err instanceof Error ? err.message : "Error generating recovery phrase",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleExecuteRecovery(e: React.FormEvent) {
    e.preventDefault();
    try {
      setIsRecovering(true);
      setRecoveryError(null);
      setRecoverySuccess(null);

      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recover_account",
          oldPubkey: oldAddressInput.trim(),
          newPubkey: newAddressInput.trim() || walletPubkey,
          recoveryPhrase: phraseInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Recovery failed");
      }

      setRecoverySuccess(data.message);
      showToast({
        type: "success",
        title: "Account Restored",
        message: `${data.reboundCount} medical records successfully transferred to your new wallet.`,
        duration: 7000,
      });

      await onRecoverySuccess();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      setRecoveryError(err instanceof Error ? err.message : "Account recovery failed");
    } finally {
      setIsRecovering(false);
    }
  }

  async function handleSaveGuardian(e: React.FormEvent) {
    e.preventDefault();
    try {
      setIsSavingGuardian(true);
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_guardian",
          pubkey: walletPubkey,
          guardianPubkey: guardianInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to set guardian");
      }
      showToast({
        type: "success",
        title: "Guardian Configured",
        message: "Trusted guardian address saved for emergency wallet recovery.",
      });
    } catch (err) {
      console.error(err);
      showToast({
        type: "error",
        title: "Failed",
        message: err instanceof Error ? err.message : "Error setting guardian",
      });
    } finally {
      setIsSavingGuardian(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Account Recovery & Social Guardian"
      description="Protect your off-chain encrypted medical vault against device or wallet key loss."
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Navigation Mode Tabs */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-100/70 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("generate")}
            className={`flex-1 rounded-lg py-1.5 transition ${
              mode === "generate" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            1. Recovery Phrase
          </button>
          <button
            type="button"
            onClick={() => setMode("guardian")}
            className={`flex-1 rounded-lg py-1.5 transition ${
              mode === "guardian" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            2. Social Guardian
          </button>
          <button
            type="button"
            onClick={() => setMode("recover")}
            className={`flex-1 rounded-lg py-1.5 transition ${
              mode === "recover" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            3. Restore Records
          </button>
        </div>

        {/* Tab 1: Generate Keyphrase */}
        {mode === "generate" && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Generate a cryptographic 12-word recovery passphrase. If you lose access to your Solana wallet or device, this keyphrase proves ownership and restores all your records to a newly connected wallet.
            </p>

            {generatedPhrase ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                      Your 12-Word Recovery Passphrase
                    </span>
                    <CopyButton text={generatedPhrase} label="Copy Phrase" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {generatedPhrase.split(" ").map((word, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-white px-2.5 py-1.5 font-mono text-[11px] font-semibold text-slate-800"
                      >
                        <span className="text-slate-400 select-none text-[10px]">{i + 1}.</span>
                        <span>{word}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 text-[11px]">
                  ⚠️ <strong>Important</strong>: Never share your recovery phrase. MedTrust employees will never ask for it. Write it down offline.
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 mb-3">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Recovery Phrase Active Yet</h4>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Click below to generate your deterministic emergency recovery passphrase.
                </p>
                <button
                  type="button"
                  onClick={handleGeneratePhrase}
                  disabled={isGenerating}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {isGenerating ? "Generating..." : "Generate 12-Word Phrase"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Social Guardian */}
        {mode === "guardian" && (
          <form onSubmit={handleSaveGuardian} className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Designate a trusted family member, primary care clinic, or legal representative as your social recovery guardian. If you are incapacitated or lose your keys, they can authorize the transfer of your health vault.
            </p>

            <div>
              <label htmlFor="guardian-pubkey" className="block text-xs font-bold text-slate-700">
                Guardian Solana Public Key
              </label>
              <input
                id="guardian-pubkey"
                type="text"
                required
                value={guardianInput}
                onChange={(e) => setGuardianInput(e.target.value)}
                placeholder="Paste guardian Solana base58 wallet address..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingGuardian}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isSavingGuardian ? "Saving..." : "Save Designated Guardian"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Account Restoration */}
        {mode === "recover" && (
          <form onSubmit={handleExecuteRecovery} className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Lost access to your previous wallet? Enter your original wallet address and 12-word recovery passphrase to securely re-anchor your encrypted medical records to your current active wallet.
            </p>

            {recoverySuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 font-semibold">
                ✓ {recoverySuccess}
              </div>
            )}

            {recoveryError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900 font-semibold">
                ✕ {recoveryError}
              </div>
            )}

            <div>
              <label htmlFor="old-wallet-input" className="block text-xs font-bold text-slate-700">
                Previous / Lost Wallet Address
              </label>
              <input
                id="old-wallet-input"
                type="text"
                required
                value={oldAddressInput}
                onChange={(e) => setOldAddressInput(e.target.value)}
                placeholder="25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label htmlFor="new-wallet-input" className="block text-xs font-bold text-slate-700">
                Destination (New) Wallet Address
              </label>
              <input
                id="new-wallet-input"
                type="text"
                required
                value={newAddressInput}
                onChange={(e) => setNewAddressInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label htmlFor="phrase-input" className="block text-xs font-bold text-slate-700">
                12-Word Recovery Passphrase
              </label>
              <textarea
                id="phrase-input"
                rows={3}
                required
                value={phraseInput}
                onChange={(e) => setPhraseInput(e.target.value)}
                placeholder="Enter your 12 words separated by spaces..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRecovering}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isRecovering ? "Verifying & Transferring..." : "Restore Vault Records"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

