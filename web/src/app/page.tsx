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

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-[#171827]">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <section className="flex-1">
          <Header />

          <div className="px-6 py-8 sm:px-8 lg:px-10">
            {activeTab === "Overview" && <Overview records={records} />}

            {activeTab === "Medical Records" && (
              <MedicalRecords records={records} />
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

function Overview({ records }: { records: MedicalRecord[] }) {
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

  return (
    <div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Your health. Your control.
        </h2>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#858694]">
          One place for your medical records and access permissions.
        </p>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#858694]">
          Verify that your records have not been altered and control who can
          access them.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Medical records" value={String(records.length)} />

        <StatCard label="Active access" value={String(activeAccess)} />

        <StatCard
          label="Verified records"
          value={String(
            records.filter((record) => record.status === "Verified").length,
          )}
        />
      </div>

      <div className="mt-8">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Medical records</h3>

          <p className="mt-1 text-sm text-[#858694]">
            Records linked to your identity
          </p>
        </div>

        <div className="divide-y divide-[#eeeeF3] overflow-hidden rounded-2xl border border-[#e5e6ed] bg-white">
          {records.map((record) => (
            <RecordCard
              key={record.id}
              title={record.title}
              provider={record.provider}
              date={record.date}
              verified={record.status === "Verified"}
            />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Access control</h3>

          <p className="mt-1 text-sm text-[#858694]">
            Manage who can access your medical records.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e5e6ed] bg-white">
          {consent ? (
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">MedTrust Demo Clinic</p>

                <p className="mt-1 text-sm text-[#858694]">
                  Record #{consent.recordId}
                </p>

                <p className="mt-1 text-xs text-[#858694]">
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

              <span
                className={`w-fit rounded-full px-3 py-1.5 text-xs font-medium ${
                  consent.active
                    ? "bg-[#edf8f1] text-[#3d8560]"
                    : "bg-[#f7eeee] text-[#a24d4d]"
                }`}
              >
                {consent.active ? "Active" : "Revoked"}
              </span>
            </div>
          ) : (
            <div className="p-5 text-sm text-[#858694]">
              Loading access permissions...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MedicalRecords({ records }: { records: MedicalRecord[] }) {
  const { publicKey } = useWallet();
  const [verified, setVerified] = useState(false);
  const [walletMatches, setWalletMatches] = useState(false);
  const [chainRecord, setChainRecord] = useState<RecordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyRecord() {
      try {
        const data = await getRecord();

        setWalletMatches(publicKey?.toBase58() === data.patient);

        console.log("Connected wallet:", publicKey?.toBase58());
        console.log("Record patient:", data.patient);
        console.log("Wallet matches:", publicKey?.toBase58() === data.patient);

        const response = await fetch("/sample-medical-record.txt");

        if (!response.ok) {
          throw new Error("Unable to load the medical record file");
        }

        const medicalRecord = await response.text();
        const localHash = await sha256(medicalRecord);

        setChainRecord(data);
        setError(null);

        setVerified(localHash === data.recordHash);

      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Unable to verify the record.",
        );
      } finally {
        setLoading(false);
      }
    }

    verifyRecord();
  }, [publicKey]);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Medical records
          </h2>

          <p className="mt-1 text-sm text-[#858694]">
            All records linked to your identity
          </p>
        </div>

        <button className="rounded-xl bg-[#6254e7] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#5144d8]">
          + Add record
        </button>
      </div>

      {loading && (
        <div className="rounded-2xl border border-[#e5e6ed] bg-white p-6 text-sm text-[#858694]">
          Reading record from Solana Devnet...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-[#eadada] bg-white p-6 text-sm text-[#a24d4d]">
          {error}
        </div>
      )}

      {!loading && chainRecord && walletMatches && (
        <div className="space-y-4">
          {records.map((record) => (
            <div
              key={record.id}
              className="overflow-hidden rounded-2xl border border-[#e5e6ed] bg-white"
            >
              <RecordCard
                title={record.title}
                provider={record.provider}
                date={new Date(chainRecord.createdAt * 1000).toLocaleDateString(
                  "en-US",
                  {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
                verified={verified}
              />

              <div className="border-t border-[#eef0f4] px-5 py-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Detail
                    label="Record ID"
                    value={`#${chainRecord.recordId}`}
                  />

                  <Detail label="Blockchain" value="Solana Devnet" />

                  <Detail label="Storage" value="Encrypted off-chain" />
                </div>

                <div className="mt-5 border-t border-[#eef0f4] pt-4">
                  <p className="text-xs text-[#858694]">SHA-256 record hash</p>

                  <p className="mt-1 break-all font-mono text-xs text-[#5e6070]">
                    {chainRecord.recordHash}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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
  return (
    <div className="rounded-2xl border border-[#e5e6ed] bg-white p-5">
      <p className="text-sm text-[#858694]">{label}</p>

      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
