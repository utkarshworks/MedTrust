"use client";

import Badge from "@/components/ui/Badge";

interface RecordCardProps {
  title: string;
  provider: string;
  date: string;
  verified: boolean;
  recordId?: number;
  onView?: () => void;
}

export default function RecordCard({
  title,
  provider,
  date,
  verified,
  recordId = 1,
  onView,
}: RecordCardProps) {
  return (
    <div className="group flex flex-col gap-4 p-5 transition-all duration-150 hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20 shadow-xs">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
            <path d="M10 9H8" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-indigo-900 transition-colors">
              {title}
            </h3>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
              #{recordId}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="font-medium text-slate-700">{provider}</span>
            <span aria-hidden="true" className="text-slate-300">
              •
            </span>
            <span>{date}</span>
          </div>

          <div className="mt-2.5">
            <Badge variant={verified ? "success" : "danger"}>
              {verified ? "Solana Integrity Confirmed" : "Integrity Mismatch"}
            </Badge>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onView}
        className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:self-center"
      >
        <span>Inspect & Verify</span>
        <svg className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
