"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { HealthcareProvider, MedicalDocumentRecord } from "@/lib/storage";
import { ConsentData, verifyAccessOnChain, getConsentPda } from "@/lib/consent";
import { useCurrentTimestamp } from "@/hooks/useCurrentTime";

interface ProviderPortalTabProps {
  currentProvider: HealthcareProvider;
  providers: HealthcareProvider[];
  documents: MedicalDocumentRecord[];
  consent: ConsentData | null;
  onOpenCreateRecord: () => void;
  onRefreshData: () => Promise<void>;
}

export default function ProviderPortalTab({
  currentProvider,
  providers,
  documents,
  consent,
  onOpenCreateRecord,
  onRefreshData,
}: ProviderPortalTabProps) {
  const currentTimestamp = useCurrentTimestamp();
  const { publicKey, sendTransaction } = useWallet();
  const { showToast, updateToast } = useToast();

  // State for retrieved document
  const [retrievedDoc, setRetrievedDoc] = useState<MedicalDocumentRecord | null>(null);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [retrievalError, setRetrievalError] = useState<string | null>(null);
  const [retrievalSuccess, setRetrievalSuccess] = useState<string | null>(null);

  // State for on-chain verify_access transaction
  const [isVerifyingOnChain, setIsVerifyingOnChain] = useState(false);
  const [verifyOnChainTx, setVerifyOnChainTx] = useState<string | null>(null);

  // Register Provider modal state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regName, setRegName] = useState("");
  const [regLicense, setRegLicense] = useState("");
  const [regSpecialty, setRegSpecialty] = useState("General Practice");
  const [regPubkey, setRegPubkey] = useState("");
  const [regMessage, setRegMessage] = useState<string | null>(null);

  // Referral Modal state
  const [referralDoc, setReferralDoc] = useState<MedicalDocumentRecord | null>(null);
  const [targetProviderPubkey, setTargetProviderPubkey] = useState<string>("");
  const [referralReason, setReferralReason] = useState<string>("");
  const [referralUrgency, setReferralUrgency] = useState<"Routine" | "Urgent" | "STAT">("Routine");
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);

  // Emergency Break-Glass state (HIPAA § 164.312)
  const [breakGlassDoc, setBreakGlassDoc] = useState<MedicalDocumentRecord | null>(null);
  const [isBreakGlassModalOpen, setIsBreakGlassModalOpen] = useState(false);
  const [breakGlassReason, setBreakGlassReason] = useState("Acute unresponsive trauma patient, checking critical blood type and life-threatening drug allergies");
  const [isSubmittingBreakGlass, setIsSubmittingBreakGlass] = useState(false);

  // Active provider selector
  const [activeProviderPubkey, setActiveProviderPubkey] = useState(currentProvider.pubkey);
  const activeProvider =
    providers.find((p) => p.pubkey === activeProviderPubkey) || currentProvider;

  const isConsentActive =
    Boolean(consent?.active && consent.expiresAt > currentTimestamp);

  /**
   * Performs an access-controlled document retrieval through the MedTrust backend API boundary.
   * If consent is revoked or expired, the backend returns 403 Forbidden.
   * If emergency break-glass is invoked, enforces mandatory elevated audit logging.
   */
  async function handleRetrieveDocument(docId: string, isBreakGlass = false, emergencyReason = "") {
    try {
      setIsRetrieving(true);
      setRetrievalError(null);
      setRetrievalSuccess(null);
      setRetrievedDoc(null);
      setVerifyOnChainTx(null);

      const headers: Record<string, string> = {
        "x-requester-pubkey": activeProvider.pubkey,
        "x-requester-role": "Provider",
      };

      if (isBreakGlass) {
        headers["x-emergency-break-glass"] = "true";
        headers["x-break-glass-reason"] = emergencyReason || "Acute emergency medical evaluation";
      }

      const res = await fetch(`/api/documents/${docId}`, { headers });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setRetrievalError(
          data.error || "ACCESS DENIED (403): You do not hold active on-chain consent to view this record."
        );
        return;
      }

      setRetrievedDoc(data.document);
      setRetrievalSuccess(
        isBreakGlass
          ? `[EMERGENCY BREAK-GLASS AUTHORIZED] Retrieved and decrypted record #${data.document.recordId} under acute emergency protocol (Audit ID recorded).`
          : `Authorized access granted! Retrieved and decrypted record #${data.document.recordId} with valid Solana consent.`
      );
      await onRefreshData();
    } catch (err) {
      console.error("Retrieval failed:", err);
      setRetrievalError("Network error while verifying authorization.");
    } finally {
      setIsRetrieving(false);
    }
  }

  /**
   * Executes the on-chain verify_access instruction on Solana Devnet.
   */
  async function handleVerifyOnChain() {
    if (!publicKey) {
      setRetrievalError("Connect your provider wallet to sign the verify_access instruction.");
      return;
    }

    const toastId = showToast({
      type: "loading",
      title: "Verifying Access on Solana...",
      message: "Submitting verify_access instruction to Devnet",
      duration: 0,
    });

    try {
      setIsVerifyingOnChain(true);
      const targetPatient = consent?.patient || retrievedDoc?.patientPubkey || "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m";
      const targetRecordId = consent?.recordId || retrievedDoc?.recordId || 1;
      const patientPk = new PublicKey(targetPatient);
      const consentPda = getConsentPda(patientPk, publicKey, targetRecordId);

      const signature = await verifyAccessOnChain(publicKey, consentPda, sendTransaction);
      setVerifyOnChainTx(signature);

      updateToast(toastId, {
        type: "success",
        title: "Access Confirmed On-Chain",
        message: "Solana runtime validated active consent and non-expired window.",
        txHash: signature,
        duration: 6000,
      });
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to execute verify_access on-chain";
      setRetrievalError(msg);
      updateToast(toastId, {
        type: "error",
        title: "Verification Failed",
        message: msg,
        duration: 5000,
      });
    } finally {
      setIsVerifyingOnChain(false);
    }
  }

  async function handleRegisterProvider(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          licenseNumber: regLicense,
          specialty: regSpecialty,
          pubkey: regPubkey || publicKey?.toBase58() || "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRegMessage("Registration submitted! Credentials pending admin verification.");
        await onRefreshData();
        setTimeout(() => {
          setIsRegisterOpen(false);
          setRegMessage(null);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSubmitReferral(e: React.FormEvent) {
    e.preventDefault();
    if (!referralDoc) return;

    const targetProvider = providers.find((p) => p.pubkey === targetProviderPubkey);
    const destName = targetProvider ? targetProvider.name : targetProviderPubkey;

    const toastId = showToast({
      type: "loading",
      title: "Issuing Clinical Referral...",
      message: `Routing record #${referralDoc.recordId} to ${destName}`,
      duration: 0,
    });

    try {
      setIsSubmittingReferral(true);

      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PROVIDER_REFERRAL",
          actorPubkey: activeProvider.pubkey,
          actorRole: "Provider",
          targetId: referralDoc.id,
          details: `${activeProvider.name} referred patient (${referralDoc.patientPubkey.slice(0, 4)}...${referralDoc.patientPubkey.slice(-4)}) record #${referralDoc.recordId} (${referralDoc.title}) to ${destName}. Urgency: ${referralUrgency}. Clinical memo: ${referralReason || "Consultation requested."}`,
          success: true,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to record referral");

      updateToast(toastId, {
        type: "success",
        title: "Clinical Referral Dispatched",
        message: `Successfully referred record #${referralDoc.recordId} to ${destName}.`,
        duration: 6000,
      });

      await onRefreshData();
      setReferralDoc(null);
      setReferralReason("");
    } catch (err) {
      console.error(err);
      updateToast(toastId, {
        type: "error",
        title: "Referral Failed",
        message: err instanceof Error ? err.message : "Failed to record referral",
        duration: 5000,
      });
    } finally {
      setIsSubmittingReferral(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Active Provider Switcher */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Clinical Workspace</span>
            <span>/</span>
            <span className="text-indigo-600">Provider Portal</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Healthcare Provider Workspace
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
            Verify patient consents, retrieve authorized encrypted clinical documents, and issue verifiable health records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            Register New Provider
          </button>
          <button
            type="button"
            onClick={onOpenCreateRecord}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Issue Clinical Record</span>
          </button>
        </div>
      </section>

      {/* Provider Credentials Card */}
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 via-white to-slate-50/50 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{activeProvider.name}</h3>
                <Badge variant={activeProvider.verificationStatus === "Verified" ? "success" : "warning"}>
                  {activeProvider.verificationStatus === "Verified" ? "Verified License" : "Pending Approval"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                License #{activeProvider.licenseNumber} · {activeProvider.specialty} ({activeProvider.facilityType})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left sm:text-right text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Testing Persona</span>
              <select
                value={activeProviderPubkey}
                onChange={(e) => setActiveProviderPubkey(e.target.value)}
                className="mt-0.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.pubkey}>
                    {p.name} ({p.verificationStatus})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Retrieval Feedback Banners */}
      {retrievalSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4.5 text-xs text-emerald-900 flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold">
            ✓
          </span>
          <div>
            <p className="font-bold">Cryptographic Authorization Succeeded</p>
            <p className="mt-0.5 text-emerald-800">{retrievalSuccess}</p>
          </div>
        </div>
      )}

      {retrievalError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4.5 text-xs text-rose-900 flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold">
            ✕
          </span>
          <div>
            <p className="font-bold">Access Boundary Enforcement: Request Denied</p>
            <p className="mt-0.5 text-rose-800 leading-relaxed">{retrievalError}</p>
            <p className="mt-1 text-[11px] text-rose-600">
              Note: This proves that off-chain storage strictly respects the on-chain consent state. When consent is revoked or expired, document retrieval is physically blocked.
            </p>
          </div>
        </div>
      )}

      {/* Decrypted Document Viewer (When Authorized) */}
      {retrievedDoc && (
        <section className="rounded-2xl border border-emerald-200 bg-white shadow-md overflow-hidden">
          <div className="border-b border-emerald-100 bg-emerald-50/50 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                Authorized Decrypted Document
              </span>
              <h4 className="text-base font-bold text-slate-900">{retrievedDoc.title}</h4>
              <p className="text-xs text-slate-500">Record #{retrievedDoc.recordId} · Patient: Alex Rivera</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setReferralDoc(retrievedDoc);
                  const firstOther = providers.find((p) => p.pubkey !== activeProvider.pubkey);
                  setTargetProviderPubkey(firstOther ? firstOther.pubkey : "");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 3h5v5" />
                  <path d="M4 20L21 3" />
                  <path d="M21 16v5h-5" />
                  <path d="M15 15l6 6" />
                  <path d="M4 4l5 5" />
                </svg>
                <span>Refer to Specialist</span>
              </button>

              <button
                type="button"
                onClick={handleVerifyOnChain}
                disabled={isVerifyingOnChain}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
              >
                {isVerifyingOnChain ? "Verifying on Solana..." : "Execute on-chain verify_access"}
              </button>
              <button
                type="button"
                onClick={() => setRetrievedDoc(null)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close View
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {verifyOnChainTx && (
              <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-xs text-indigo-900 flex items-center justify-between">
                <span>Solana verify_access instruction confirmed!</span>
                <a
                  href={`https://explorer.solana.com/tx/${verifyOnChainTx}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-semibold underline"
                >
                  View Tx ({verifyOnChainTx.slice(0, 8)}...)
                </a>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-700">Clinical Content:</span>
                <CopyButton text={retrievedDoc.plaintextPreview} label="Copy Text" />
              </div>
              <pre className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800 leading-relaxed overflow-x-auto">
                {retrievedDoc.plaintextPreview}
              </pre>
            </div>
          </div>
        </section>
      )}

      {/* Authorized Records Directory */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Patient Medical Records Directory
            </h3>
            <p className="text-xs text-slate-500">
              Test accessing patient records. Access is dynamically gated by on-chain consent verification.
            </p>
          </div>
          <span className="text-xs text-slate-400">{documents.length} available</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs divide-y divide-slate-100">
          {documents.map((doc) => {
            const hasActiveConsentForThis =
              activeProvider.pubkey === consent?.provider && isConsentActive && doc.recordId === consent.recordId;

            return (
              <div
                key={doc.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 hover:bg-slate-50/70 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{doc.title}</h4>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                        #{doc.recordId}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Patient: <span className="font-semibold text-slate-700">Alex Rivera</span> · {doc.category}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant={hasActiveConsentForThis ? "success" : "danger"}>
                        {hasActiveConsentForThis ? "Patient Consent Active" : "No Active Consent / Revoked"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:shrink-0 pt-2 sm:pt-0">
                  {hasActiveConsentForThis && (
                    <button
                      type="button"
                      onClick={() => {
                        setReferralDoc(doc);
                        const firstOther = providers.find((p) => p.pubkey !== activeProvider.pubkey);
                        setTargetProviderPubkey(firstOther ? firstOther.pubkey : "");
                      }}
                      className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
                    >
                      Refer
                    </button>
                  )}
                  {!hasActiveConsentForThis && (
                    <button
                      type="button"
                      onClick={() => {
                        setBreakGlassDoc(doc);
                        setIsBreakGlassModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition shadow-xs"
                      title="Emergency Break-Glass Protocol (HIPAA § 164.312)"
                    >
                      <svg className="h-3.5 w-3.5 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      <span>Break-Glass</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRetrieveDocument(doc.id)}
                    disabled={isRetrieving}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-700 transition"
                  >
                    <span>Request Document Access</span>
                    <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Register Provider Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Healthcare Provider Registration"
        description="Submit clinic, hospital, or laboratory credentials for verification on MedTrust."
        maxWidth="md"
      >
        <form onSubmit={handleRegisterProvider} className="space-y-4">
          {regMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
              {regMessage}
            </div>
          )}

          <div>
            <label htmlFor="reg-facility-name" className="block text-xs font-bold text-slate-700">
              Facility / Doctor Name
            </label>
            <input
              id="reg-facility-name"
              type="text"
              required
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="e.g. Stanford University Medical Center"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-license-num" className="block text-xs font-bold text-slate-700">
                Medical License #
              </label>
              <input
                id="reg-license-num"
                type="text"
                required
                value={regLicense}
                onChange={(e) => setRegLicense(e.target.value)}
                placeholder="e.g. MED-CA-9921"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label htmlFor="reg-specialty-input" className="block text-xs font-bold text-slate-700">
                Clinical Specialty
              </label>
              <input
                id="reg-specialty-input"
                type="text"
                value={regSpecialty}
                onChange={(e) => setRegSpecialty(e.target.value)}
                placeholder="e.g. Oncology / Radiology"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-pubkey-input" className="block text-xs font-bold text-slate-700">
              Solana Wallet Public Key
            </label>
            <input
              id="reg-pubkey-input"
              type="text"
              value={regPubkey}
              onChange={(e) => setRegPubkey(e.target.value)}
              placeholder={publicKey?.toBase58() || "Paste provider base58 pubkey"}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
            >
              Submit Application
            </button>
          </div>
        </form>
      </Modal>

      {/* Provider-to-Provider Clinical Referral Modal */}
      {referralDoc && (
        <Modal
          isOpen={Boolean(referralDoc)}
          onClose={() => setReferralDoc(null)}
          title={`Clinical Referral: Record #${referralDoc.recordId}`}
          description={`Delegate and route clinical findings from ${activeProvider.name} to another certified specialist or diagnostic facility.`}
          maxWidth="md"
        >
          <form onSubmit={handleSubmitReferral} className="space-y-4">
            <div>
              <label htmlFor="target-provider" className="block text-xs font-bold text-slate-700">
                Destination Healthcare Facility / Specialist
              </label>
              <select
                id="target-provider"
                required
                value={targetProviderPubkey}
                onChange={(e) => setTargetProviderPubkey(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {providers
                  .filter((p) => p.pubkey !== activeProvider.pubkey)
                  .map((p) => (
                    <option key={p.id} value={p.pubkey}>
                      {p.name} ({p.specialty} · {p.facilityType})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label htmlFor="referral-urgency" className="block text-xs font-bold text-slate-700">
                Clinical Priority / Urgency
              </label>
              <select
                id="referral-urgency"
                value={referralUrgency}
                onChange={(e) => setReferralUrgency(e.target.value as "Routine" | "Urgent" | "STAT")}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Routine">Routine (Within 14 days)</option>
                <option value="Urgent">Urgent (Within 48 hours)</option>
                <option value="STAT">STAT / Emergency (Immediate action)</option>
              </select>
            </div>

            <div>
              <label htmlFor="referral-notes" className="block text-xs font-bold text-slate-700">
                Referral Clinical Notes & Diagnostic Questions
              </label>
              <textarea
                id="referral-notes"
                rows={3}
                required
                value={referralReason}
                onChange={(e) => setReferralReason(e.target.value)}
                placeholder="e.g. Patient presents with elevated triglycerides. Requesting advanced cardiovascular consultation and stress echocardiogram..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-[11px] text-indigo-900 space-y-1">
              <span className="font-bold">Inter-Organizational Consent Rule</span>
              <p className="text-slate-600">
                Referrals generate an auditable inter-provider transfer memorandum. Patient consent remains authoritatively validated at document retrieval time.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReferralDoc(null)}
                disabled={isSubmittingReferral}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingReferral}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isSubmittingReferral ? "Routing..." : "Confirm & Dispatch Referral"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Emergency Break-Glass Modal (HIPAA § 164.312) */}
      {isBreakGlassModalOpen && breakGlassDoc && (
        <Modal
          isOpen={isBreakGlassModalOpen}
          onClose={() => {
            setIsBreakGlassModalOpen(false);
            setBreakGlassDoc(null);
          }}
          title="Emergency Break-Glass Protocol"
          description="Override standard consent gate for acute medical emergency. HIPAA § 164.312(a)(2)(ii) compliance."
          maxWidth="lg"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                setIsSubmittingBreakGlass(true);
                await handleRetrieveDocument(breakGlassDoc.id, true, breakGlassReason);
                setIsBreakGlassModalOpen(false);
                setBreakGlassDoc(null);
              } catch (err) {
                console.error(err);
              } finally {
                setIsSubmittingBreakGlass(false);
              }
            }}
            className="space-y-4 text-xs"
          >
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-950">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">
                  ⚠️
                </span>
                <div>
                  <h4 className="font-bold text-sm">Mandatory Elevated Audit Warning</h4>
                  <p className="mt-1 text-xs leading-relaxed text-rose-900">
                    You are initiating emergency access to Record #{breakGlassDoc.recordId} ({breakGlassDoc.title}). This action bypasses standard patient consent checks and permanently logs your provider identity, license (#{activeProvider.licenseNumber}), and rationale to the security compliance audit log.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="break-glass-rationale" className="block text-xs font-bold text-slate-700">
                Clinical Justification / Emergency Condition Rationale
              </label>
              <textarea
                id="break-glass-rationale"
                rows={3}
                required
                value={breakGlassReason}
                onChange={(e) => setBreakGlassReason(e.target.value)}
                placeholder="e.g. Patient arrived unconscious in trauma bay. Need immediate access to blood group and contraindicating drug allergies..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsBreakGlassModalOpen(false);
                  setBreakGlassDoc(null);
                }}
                disabled={isSubmittingBreakGlass}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingBreakGlass}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition shadow-xs disabled:opacity-50"
              >
                {isSubmittingBreakGlass ? "Authorizing..." : "Confirm Emergency Break-Glass"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

