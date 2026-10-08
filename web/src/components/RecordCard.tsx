interface RecordCardProps {
  title: string;
  provider: string;
  date: string;
  verified: boolean;
}

export default function RecordCard({
  title,
  provider,
  date,
  verified,
}: RecordCardProps) {
  return (
    <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f0efff] text-[#6254e7]">
          +
        </div>

        <div>
          <h3 className="font-medium">{title}</h3>

          <p className="mt-1 text-sm text-[#858694]">
            {provider} · {date}
          </p>

          <div
            className={`mt-3 flex items-center gap-2 text-xs font-medium ${
              verified ? "text-[#3d8560]" : "text-[#a24d4d]"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                verified ? "bg-[#4caf73]" : "bg-[#c45c5c]"
              }`}
            />

            {verified ? "Integrity verified" : "Integrity check failed"}
          </div>
        </div>
      </div>

      <button className="rounded-xl border border-[#dedfe7] px-4 py-2.5 text-sm font-medium transition hover:bg-[#f7f7fa]">
        View record
      </button>
    </div>
  );
}
