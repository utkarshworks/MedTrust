"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import { ConsentActivity } from "@/lib/consent";

interface ActivityTabProps {
  activities: ConsentActivity[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}

export default function ActivityTab({
  activities,
  isLoading,
  error,
  onRefresh,
}: ActivityTabProps) {
  const [filter, setFilter] = useState<"All" | "Granted" | "Revoked">("All");

  const filtered = activities.filter((act) => {
    if (filter === "All") return true;
    return act.status === filter;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-indigo-600">Audit Trail</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Solana Consent Audit Trail
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
            Immutable transaction history of all access grant and revocation events recorded on Solana Devnet.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 text-slate-500 ${isLoading ? "animate-spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Refresh Events</span>
        </button>
      </section>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        {(["All", "Granted", "Revoked"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === tab
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {tab}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">
          {filtered.length} {filtered.length === 1 ? "event" : "events"}
        </span>
      </div>

      {/* Activities list */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex items-center gap-3 p-8 text-sm text-slate-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <span>Scanning Solana Devnet blocks for consent transactions...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-600">
            Error loading audit trail: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-800">No activity recorded</p>
            <p className="mt-1 text-xs text-slate-400">
              Transactions will appear here as soon as consent is granted or revoked on-chain.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <div
                key={item.signature}
                className="group flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 hover:bg-slate-50/70 transition"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      item.status === "Granted"
                        ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20"
                        : "bg-rose-50 text-rose-600 ring-1 ring-rose-500/20"
                    }`}
                  >
                    {item.status === "Granted" ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {item.title}
                      </h4>
                      <Badge variant={item.status === "Granted" ? "success" : "danger"}>
                        {item.status}
                      </Badge>
                    </div>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Target Entity: <span className="font-semibold text-slate-700">{item.description}</span>
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="font-mono text-[11px] text-slate-400">
                        Tx: {item.signature.slice(0, 8)}...{item.signature.slice(-8)}
                      </span>
                      <CopyButton text={item.signature} label="Copy Tx" />
                      <a
                        href={`https://explorer.solana.com/tx/${item.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        <span>Explorer</span>
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-left sm:text-right">
                  <span className="text-xs font-medium text-slate-500">
                    {new Date(item.timestamp * 1000).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

