interface RecordCardProps {
  title: string;
  provider: string;
  date: string;
  verified: boolean;
  onView?: () => void;
}

export default function RecordCard({
  title,
  provider,
  date,
  verified,
  onView,
}: RecordCardProps) {
  return (
    <div className="flex flex-col gap-5 p-5 transition-colors duration-150 hover:bg-[#fdfdff] sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e8e4ff] bg-[#f3f1ff] text-[#6254e7]">
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
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-[-0.2px] text-[#24293b]">
            {title}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#858a9b]">
            <span>{provider}</span>
            <span aria-hidden="true" className="text-[#c4c7d1]">
              ·
            </span>
            <span>{date}</span>
          </div>

          <div
            className={`mt-3 inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] font-medium ${
              verified
                ? "bg-[#edf8f1] text-[#347d56]"
                : "bg-[#fbefef] text-[#a24d4d]"
            }`}
            role="status"
            aria-live="polite"
          >
            {verified ? (
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="m5.3 8 1.8 1.8 3.6-3.6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M8 4.8v3.7m0 2v.1"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            )}

            {verified ? "Integrity verified" : "Integrity check failed"}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onView}
        className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-[#e1e3eb] bg-white px-4 py-2.5 text-xs font-semibold text-[#41465a] transition-colors hover:border-[#cbc6f7] hover:bg-[#f7f6ff] hover:text-[#5144d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a9a0ff] focus-visible:ring-offset-2 sm:self-center"
      >
        View record
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path
            d="M3.5 8h9m-3.5-3.5L12.5 8 9 11.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
