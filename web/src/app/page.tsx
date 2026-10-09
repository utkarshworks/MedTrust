"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import RecordCard from "@/components/RecordCard";
import { getRecord, RecordData } from "@/lib/record";
import { sha256 } from "@/lib/hash";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { connection } from "@/lib/solana";

import {
  getConsent,
  ConsentData,
  grantConsent,
  revokeConsent,
  getConsentActivity,
  ConsentActivity,
} from "@/lib/consent";

interface MedicalRecord {
  id: number;
  title: string;
  provider: string;
  date: string;
  status: string;
}

interface AccessPermission {
  provider: string;
  record: string;
  expires: string;
  status: string;
}

const records: MedicalRecord[] = [
  {
    id: 1,
    title: "Routine Checkup",
    provider: "MedTrust Demo Clinic",
    date: "October 8, 2026",
    status: "Verified",
  },
];

const access: AccessPermission[] = [
  {
    provider: "MedTrust Demo Clinic",
    record: "Routine Checkup",
    expires: "October 15, 2026",
    status: "Active",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen w-full overflow-x-clip bg-[#f7f8fc] text-[#171827]">
      <div className="flex min-h-screen w-full">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center">
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
              className="ml-4 mr-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#e9eaf0] bg-white text-[#343a4d] transition hover:bg-[#f7f8fc] lg:hidden"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="min-w-0 flex-1">
              <Header />
            </div>
          </div>

          <div className="w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10">
            {activeTab === "Overview" && (
              <Overview
                records={records}
                onViewRecords={(recordId) => {
                  setSelectedRecordId(recordId);
                  setActiveTab("Medical Records");
                }}
              />
            )}

            {activeTab === "Medical Records" && (
              <MedicalRecords
                records={records}
                selectedRecordId={selectedRecordId}
                onSelectRecord={setSelectedRecordId}
              />
            )}

            {activeTab === "Access Control" && (
              <AccessControl access={access} />
            )}

            {activeTab === "Activity" && <Activity />}
          </div>
        </section>
      </div>
    </main>
  );
}

function Overview({
  records,
  onViewRecords,
}: {
  records: MedicalRecord[];
  onViewRecords: (recordId: number) => void;
}) {
  const [consent, setConsent] = useState<ConsentData | null>(null);

  useEffect(() => {
    async function loadConsent() {
      try {
        const data = await getConsent();
        setConsent(data);
      } catch (err) {
        console.error("Unable to load consent:", err);
      }
    }

    loadConsent();
  }, []);

  const activeAccess = consent?.active ? 1 : 0;
  const verifiedRecords = records.filter(
    (record) => record.status === "Verified",
  ).length;

  return (
    <div className="w-full min-w-0 pb-10">
      <section className="relative overflow-hidden rounded-2xl border border-[#e7e5fb] bg-gradient-to-br from-white via-white to-[#f5f3ff] px-6 py-7 sm:px-8 sm:py-9">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#ebe7ff]/60 blur-3xl" />

        <div className="relative max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e7e4ff] bg-white/80 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6254e7]" />
            <span className="text-[10px] font-semibold uppercase tracking-[1.4px] text-[#6254e7]">
              Patient-controlled records
            </span>
          </div>

          <h2 className="text-[28px] font-semibold leading-tight tracking-[-1.1px] text-[#191d30] sm:text-[34px]">
            Your health. Your control.
          </h2>

          <p className="mt-3 max-w-xl text-[14px] leading-7 text-[#71768a]">
            Keep your medical records verifiable and manage who has permission
            to access them, all from one place.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-[#686d80]">
            <span className="inline-flex items-center gap-2">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4 text-[#6254e7]"
                aria-hidden="true"
              >
                <path
                  d="M10 2.5 16 5v4c0 3.8-2.5 6.8-6 8-3.5-1.2-6-4.2-6-8V5l6-2.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="m7.5 9.5 1.7 1.7 3.3-3.4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Integrity verification
            </span>

            <span className="inline-flex items-center gap-2">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4 text-[#6254e7]"
                aria-hidden="true"
              >
                <rect
                  x="4"
                  y="8.5"
                  width="12"
                  height="9"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M7 8.5V6a3 3 0 0 1 6 0v2.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Consent-based access
            </span>
          </div>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.2px] text-[#202438]">
              At a glance
            </h3>
            <p className="mt-1 text-xs text-[#858a9b]">
              A summary of your records and permissions
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Medical records" value={String(records.length)} />
          <StatCard label="Active access" value={String(activeAccess)} />
          <StatCard label="Verified records" value={String(verifiedRecords)} />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.2px] text-[#202438]">
              Medical records
            </h3>
            <p className="mt-1 text-xs text-[#858a9b]">
              Records associated with your identity
            </p>
          </div>
          <span className="shrink-0 text-xs text-[#858a9b]">
            {records.length} {records.length === 1 ? "record" : "records"}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e7e8ef] bg-white shadow-[0_2px_8px_rgba(30,35,70,0.02)]">
          {records.map((record) => (
            <RecordCard
              key={record.id}
              title={record.title}
              provider={record.provider}
              date={record.date}
              verified={record.status === "Verified"}
              onView={() => onViewRecords(record.id)}
            />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <h3 className="text-[15px] font-semibold tracking-[-0.2px] text-[#202438]">
            Access permissions
          </h3>
          <p className="mt-1 text-xs text-[#858a9b]">
            Review who has permission to access your records
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e7e8ef] bg-white shadow-[0_2px_8px_rgba(30,35,70,0.02)]">
          {consent ? (
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1efff] text-[#6254e7]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 3.5 19 6.5v4.7c0 4.4-2.9 7.9-7 9.3-4.1-1.4-7-4.9-7-9.3V6.5l7-3Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 8v7m-3.5-3.5h7"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#252a3d]">
                    MedTrust Demo Clinic
                  </p>
                  <p className="mt-1 text-xs text-[#858a9b]">
                    Record #{consent.recordId}
                  </p>
                  <p className="mt-2 text-xs text-[#73788b]">
                    Expires{" "}
                    {new Date(consent.expiresAt * 1000).toLocaleDateString(
                      "en-IN",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${
                  consent.active
                    ? "bg-[#edf8f1] text-[#347d56]"
                    : "bg-[#fbefef] text-[#a24d4d]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    consent.active ? "bg-[#3d9569]" : "bg-[#bd5b5b]"
                  }`}
                />
                {consent.active ? "Access active" : "Access revoked"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-6">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#e4e1fb] border-t-[#6254e7]" />
              <p className="text-sm text-[#858a9b]">
                Loading access permissions from Solana...
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MedicalRecords({
  records,
  selectedRecordId,
  onSelectRecord,
}: {
  records: MedicalRecord[];
  selectedRecordId: number | null;
  onSelectRecord: (recordId: number | null) => void;
}) {
  const { publicKey } = useWallet();
  const [verified, setVerified] = useState(false);
  const [simulateTampering, setSimulateTampering] = useState(false);
  const [walletMatches, setWalletMatches] = useState(false);
  const [chainRecord, setChainRecord] = useState<RecordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verifyRecord() {
      setLoading(true);

      try {
        const data = await getRecord();

        if (cancelled) return;

        const matches = publicKey?.toBase58() === data.patient;
        setWalletMatches(matches);

        const response = await fetch("/sample-medical-record.txt");

        if (!response.ok) {
          throw new Error("Unable to load the medical record file");
        }

        const medicalRecord = await response.text();
        const localHash = await sha256(medicalRecord);

        if (cancelled) return;

        setChainRecord(data);
        setError(null);
        setVerified(!simulateTampering && localHash === data.recordHash);
      } catch (err) {
        if (cancelled) return;

        console.error(err);
        setError(
          err instanceof Error ? err.message : "Unable to verify the record.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    verifyRecord();

    return () => {
      cancelled = true;
    };
  }, [publicKey, simulateTampering]);

  const selectedRecord = records.find(
    (record) => record.id === selectedRecordId,
  );

  const visibleRecords = selectedRecord ? [selectedRecord] : records;

  const recordDate = chainRecord
    ? new Date(chainRecord.createdAt * 1000).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="w-full min-w-0 pb-10">
      <section className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[1.4px] text-[#9296a5]">
            <span>Workspace</span>
            <span className="text-[#c7c9d3]">/</span>
            <span className="text-[#6254e7]">Medical records</span>
          </div>

          <h2 className="text-[26px] font-semibold tracking-[-0.9px] text-[#1b2032] sm:text-[30px]">
            Medical records
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[#777c8f]">
            Review your record details and verify that your medical data matches
            its integrity hash on Solana.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSimulateTampering((current) => !current)}
          disabled={loading}
          className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a9a0ff] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            simulateTampering
              ? "border border-[#ecdada] bg-[#fff7f7] text-[#a24d4d] hover:bg-[#fceeee]"
              : "border border-[#e1defb] bg-[#f5f3ff] text-[#584bd3] hover:bg-[#ece9ff]"
          }`}
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4"
            aria-hidden="true"
          >
            {simulateTampering ? (
              <path
                d="M4 10a6 6 0 1 0 1.8-4.3L4 7.5M4 4.5v3h3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="m10 2.5 6 2.4v4c0 3.7-2.5 6.6-6 7.9-3.5-1.3-6-4.2-6-7.9v-4l6-2.4Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            )}
          </svg>
          {simulateTampering ? "Restore verification" : "Test tampering"}
        </button>
      </section>

      <section className="mb-6 rounded-2xl border border-[#e6e7ee] bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1efff] text-[#6254e7]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M12 3.5 19 6.5v4.7c0 4.4-2.9 7.9-7 9.3-4.1-1.4-7-4.9-7-9.3V6.5l7-3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M12 8v4m0 3h.01"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[#252a3d]">
              Record integrity check
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#858a9b]">
              A SHA-256 hash is calculated from the local record and compared
              with the hash stored on Solana.
            </p>
          </div>

          <span className="hidden shrink-0 rounded-full border border-[#e7e8ef] bg-[#fafafd] px-2.5 py-1 text-[10px] font-medium text-[#777c8f] sm:inline-flex">
            SHA-256
          </span>
        </div>

        {loading && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#e8e9f0] bg-[#fafafd] p-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#e4e1fb] border-t-[#6254e7]" />
            <p className="text-xs text-[#777c8f]">
              Reading the record and checking its integrity…
            </p>
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-[#f0dada] bg-[#fff7f7] p-4"
          >
            <p className="text-sm font-semibold text-[#a24d4d]">
              Verification could not be completed
            </p>
            <p className="mt-1 break-words text-xs leading-5 text-[#9b6565]">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && !walletMatches && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-[#eee1c5] bg-[#fffbf0] p-4"
          >
            <p className="text-sm font-semibold text-[#8b6a28]">
              Patient wallet not matched
            </p>
            <p className="mt-1 text-xs leading-5 text-[#907b51]">
              Connect the wallet associated with this record to view its
              details.
            </p>
          </div>
        )}

        {!loading && !error && walletMatches && chainRecord && (
          <div
            className={`mt-5 rounded-xl border p-4 sm:p-5 ${
              verified
                ? "border-[#d8ecdf] bg-[#f5fbf7]"
                : "border-[#f0dada] bg-[#fff7f7]"
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  verified
                    ? "bg-[#e0f3e7] text-[#347d56]"
                    : "bg-[#f8e5e5] text-[#a24d4d]"
                }`}
              >
                {verified ? (
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      d="m5 10 3.2 3.2L15 6.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      d="M10 5.5v5m0 3h.01"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="10"
                      cy="10"
                      r="7.25"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold ${
                    verified ? "text-[#347d56]" : "text-[#a24d4d]"
                  }`}
                >
                  {verified
                    ? "Record integrity verified"
                    : "Record integrity mismatch"}
                </p>

                <p
                  className={`mt-1 text-xs leading-5 ${
                    verified ? "text-[#5c856b]" : "text-[#9b6565]"
                  }`}
                >
                  {simulateTampering
                    ? "Tampering simulation is enabled. This test forces the interface to show a failed verification state; it does not modify the on-chain record or the local file."
                    : verified
                      ? "The local record's calculated SHA-256 hash matches the hash retrieved from Solana."
                      : "The calculated SHA-256 hash does not match the hash retrieved from Solana. The record should not be treated as verified."}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {!loading && !error && walletMatches && chainRecord && (
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {selectedRecordId !== null && (
                <button
                  type="button"
                  onClick={() => onSelectRecord(null)}
                  className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-[#6254e7] transition hover:text-[#4436c5]"
                >
                  <span aria-hidden="true">←</span>
                  Back to all records
                </button>
              )}

              <h3 className="text-[15px] font-semibold tracking-[-0.2px] text-[#202438]">
                Record details
              </h3>
              <p className="mt-1 text-xs text-[#858a9b]">
                Record metadata and integrity information
              </p>
            </div>

            <span className="shrink-0 text-xs text-[#858a9b]">
              Record #{chainRecord.recordId}
            </span>
          </div>

          <div className="space-y-4">
            {visibleRecords.map((record) => (
              <div
                key={record.id}
                className="overflow-hidden rounded-2xl border border-[#e5e6ed] bg-white shadow-[0_2px_8px_rgba(30,35,70,0.02)]"
              >
                <div className="p-5 sm:px-6 sm:py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-base font-semibold tracking-tight text-[#202438]">
                        {record.title}
                      </h4>

                      <p className="mt-1 text-xs text-[#777c8f]">
                        {record.provider}
                      </p>

                      <p className="mt-1 text-xs text-[#9296a5]">
                        {recordDate}
                      </p>
                    </div>

                    <span
                      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${
                        verified
                          ? "bg-[#edf8f1] text-[#347d56]"
                          : "bg-[#fbefef] text-[#a24d4d]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          verified ? "bg-[#3d9569]" : "bg-[#bd5b5b]"
                        }`}
                      />
                      {verified ? "Integrity verified" : "Integrity mismatch"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#eef0f4] p-5 sm:px-6 sm:py-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-[#ececf2] bg-[#fafafd] p-4">
                      <Detail
                        label="Record ID"
                        value={`#${chainRecord.recordId}`}
                      />
                    </div>

                    <div className="rounded-xl border border-[#ececf2] bg-[#fafafd] p-4">
                      <Detail label="Blockchain" value="Solana Devnet" />
                    </div>

                    <div className="rounded-xl border border-[#ececf2] bg-[#fafafd] p-4">
                      <Detail label="Storage" value="Off-chain file" />
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-[#e8e9f0] p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-[#353a4e]">
                          Stored integrity hash
                        </h4>
                        <p className="mt-1 text-[11px] text-[#858a9b]">
                          SHA-256 · Retrieved from Solana
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${
                          verified
                            ? "bg-[#edf8f1] text-[#347d56]"
                            : "bg-[#fbefef] text-[#a24d4d]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            verified ? "bg-[#3d9569]" : "bg-[#bd5b5b]"
                          }`}
                        />
                        {verified ? "Match confirmed" : "No match"}
                      </span>
                    </div>

                    <p className="mt-4 break-all rounded-lg bg-[#f7f7fa] p-3 font-mono text-[11px] leading-6 text-[#555b6e]">
                      {chainRecord.recordHash}
                    </p>

                    <p className="mt-3 text-[11px] leading-5 text-[#858a9b]">
                      {verified
                        ? "The calculated hash of the local file matches this stored value."
                        : "The current verification result does not confirm a match with this stored value."}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AccessControl({ access }: { access: AccessPermission[] }) {
  const { publicKey, sendTransaction } = useWallet();

  const [consent, setConsent] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadConsent() {
    try {
      setLoading(true);

      const data = await getConsent();

      setConsent(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to load consent status.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConsent();
  }, []);

  async function handleGrant() {
    if (!publicKey) {
      setError("Connect the patient wallet before granting access.");
      return;
    }

    if (publicKey.toBase58() !== consent?.patient) {
      setError("The connected wallet is not the patient wallet.");
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      setSuccess(null);

      const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

      const signature = await grantConsent(
        publicKey,
        new PublicKey(consent.provider),
        consent.recordId,
        expiresAt,
        sendTransaction,
      );

      await connection.confirmTransaction(signature, "confirmed");

      setSuccess("Access granted successfully.");
      await loadConsent();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to grant access.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleRevoke() {
    if (!publicKey) {
      setError("Connect the patient wallet before revoking access.");
      return;
    }

    if (publicKey.toBase58() !== consent?.patient) {
      setError("The connected wallet is not the patient wallet.");
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      setSuccess(null);

      const signature = await revokeConsent(
        publicKey,
        new PublicKey(consent.provider),
        consent.recordId,
        sendTransaction,
      );

      await connection.confirmTransaction(signature, "confirmed");

      setSuccess("Access revoked successfully.");
      await loadConsent();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to revoke access.");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div>
        <p className="text-sm text-[#858694]">Loading access permissions...</p>
      </div>
    );
  }

  if (error && !consent) {
    return (
      <div className="rounded-2xl border border-[#eadada] bg-white p-6">
        <p className="text-sm font-medium text-[#a24d4d]">
          Unable to load access permissions.
        </p>

        <p className="mt-1 text-sm text-[#858694]">{error}</p>
      </div>
    );
  }

  if (!consent) {
    return null;
  }

  const walletMatches = publicKey?.toBase58() === consent.patient;

  return (
    <div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Access control
        </h2>

        <p className="mt-1 text-sm text-[#858694]">
          Manage who can access your medical records.
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#e5e6ed] bg-white">
        <div className="p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">MedTrust Demo Clinic</p>

              <p className="mt-1 text-sm text-[#858694]">Routine Checkup</p>

              <p className="mt-2 text-xs text-[#858694]">
                Record #{consent.recordId}
              </p>
            </div>

            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                consent.active
                  ? "bg-[#edf8f1] text-[#3d8560]"
                  : "bg-[#f7eeee] text-[#a24d4d]"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  consent.active ? "bg-[#4caf73]" : "bg-[#c45c5c]"
                }`}
              />

              {consent.active ? "Active" : "Revoked"}
            </div>
          </div>

          <div className="mt-5 grid gap-4 border-t border-[#eeeeF3] pt-5 sm:grid-cols-2">
            <Detail
              label="Provider"
              value={`${consent.provider.slice(0, 4)}...${consent.provider.slice(-4)}`}
            />

            <Detail
              label="Expires"
              value={new Date(consent.expiresAt * 1000).toLocaleDateString(
                "en-US",
              )}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3 border-t border-[#eeeeF3] pt-5">
            {!consent.active ? (
              <button
                onClick={handleGrant}
                disabled={processing || !walletMatches}
                className="rounded-xl bg-[#6254e7] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#5144d8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processing ? "Processing..." : "Grant access"}
              </button>
            ) : (
              <button
                onClick={handleRevoke}
                disabled={processing || !walletMatches}
                className="rounded-xl border border-[#dedfe7] px-4 py-2.5 text-sm font-medium transition hover:bg-[#f7f7fa] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processing ? "Processing..." : "Revoke access"}
              </button>
            )}
          </div>

          {!walletMatches && (
            <p className="mt-3 text-xs text-[#a24d4d]">
              Connect the patient wallet to manage this permission.
            </p>
          )}

          {error && <p className="mt-3 text-sm text-[#a24d4d]">{error}</p>}

          {success && <p className="mt-3 text-sm text-[#3d8560]">{success}</p>}
        </div>
      </div>
    </div>
  );
}

function Activity() {
  const [activities, setActivities] = useState<ConsentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadActivity() {
      try {
        setError("");

        const data = await getConsentActivity();

        setActivities(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load activity from Solana",
        );
      } finally {
        setLoading(false);
      }
    }

    loadActivity();
  }, []);

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Activity</h2>

        <p className="mt-1 text-sm text-[#858694]">
          Recent activity related to your records and permissions
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e5e6ed] bg-white">
        {loading ? (
          <div className="p-5 text-sm text-[#858694]">
            Loading activity from Solana...
          </div>
        ) : error ? (
          <div className="p-5 text-sm text-red-600">{error}</div>
        ) : activities.length === 0 ? (
          <div className="p-5 text-sm text-[#858694]">
            No consent activity found.
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.signature}
              className="flex flex-col gap-3 border-b border-[#eef0f4] p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3 className="text-sm font-medium">{activity.title}</h3>

                <p className="mt-1 text-sm text-[#858694]">
                  {activity.description}
                </p>

                <a
                  href={`https://explorer.solana.com/tx/${activity.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-[#6254e7] hover:underline"
                >
                  View transaction
                </a>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-[#858694]">
                  {new Date(activity.timestamp * 1000).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>

                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    activity.status === "Granted"
                      ? "bg-[#edf8f1] text-[#3d8560]"
                      : "bg-[#f5f5f7] text-[#6f7180]"
                  }`}
                >
                  {activity.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ActivityRow({
  title,
  description,
  time,
  status,
}: {
  title: string;
  description: string;
  time: string;
  status: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#eef0f4] p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>

        <p className="mt-1 text-sm text-[#858694]">{description}</p>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs text-[#858694]">{time}</span>

        <span className="rounded-full bg-[#f0efff] px-2.5 py-1 text-[11px] font-medium text-[#6254e7]">
          {status}
        </span>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#858694]">{label}</p>

      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  const iconByLabel: Record<string, React.ReactNode> = {
    "Medical records": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          d="M7 3.75h7l4 4v12.5H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M14 3.75v4h4M8.5 12h6M8.5 15.5h6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
    "Active access": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          d="M12 3.5 19 6.5v4.7c0 4.4-2.9 7.9-7 9.3-4.1-1.4-7-4.9-7-9.3V6.5l7-3Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="m9 12 2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    "Verified records": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="8.25"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="m8.5 12 2.3 2.3 4.7-4.7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  };

  const accentByLabel: Record<string, string> = {
    "Medical records": "bg-[#f0efff] text-[#6254e7]",
    "Active access": "bg-[#edf8f1] text-[#3d8560]",
    "Verified records": "bg-[#edf8f1] text-[#3d8560]",
  };

  return (
    <div className="group rounded-2xl border border-[#e7e8ef] bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#d8d5fa] hover:shadow-[0_8px_24px_rgba(34,38,70,0.045)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-[#74798b]">{label}</p>
          <p className="mt-3 text-[30px] font-semibold leading-none tracking-[-1px] text-[#1b2032]">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            accentByLabel[label] ?? "bg-[#f4f5f9] text-[#74798b]"
          }`}
        >
          {iconByLabel[label] ?? null}
        </div>
      </div>

      <div className="mt-5 border-t border-[#f0f1f5] pt-3">
        <p className="text-[11px] text-[#969aaa]">
          {label === "Medical records"
            ? "Records linked to your identity"
            : label === "Active access"
              ? "Current provider permissions"
              : "Matching on-chain integrity hash"}
        </p>
      </div>
    </div>
  );
}
