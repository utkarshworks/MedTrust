"use client";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

const navigation = [
  { label: "Overview", number: "01" },
  { label: "Medical Records", number: "02" },
  { label: "Access Control", number: "03" },
  { label: "Activity", number: "04" },
];

export default function Sidebar({
  activeTab,
  onTabChange,
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#171827]/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[248px] shrink-0 flex-col border-r border-[#e9eaf0] bg-white px-5 py-7 transition-transform duration-200 lg:sticky lg:z-auto lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {" "}
        <div className="mb-12 flex items-center gap-3 px-2">
          {" "}
          <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#6254e7] text-white shadow-sm shadow-[#6254e7]/20">
            {" "}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-[22px] w-[22px]"
              aria-hidden="true"
            >
              {" "}
              <path
                d="M12 3.5 19 6.5V11.2C19 15.6 16.1 19.1 12 20.5 7.9 19.1 5 15.6 5 11.2V6.5L12 3.5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />{" "}
              <path
                d="M12 8V15M8.5 11.5H15.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />{" "}
            </svg>{" "}
          </div>
          <div>
            <span className="block text-[17px] font-semibold tracking-[-0.6px] text-[#171b2c]">
              MedTrust
            </span>
            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[1.7px] text-[#8b90a1]">
              Health records
            </span>
          </div>
        </div>
        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[1.6px] text-[#9a9eac]">
          Workspace
        </div>
        <nav aria-label="Main navigation" className="space-y-1">
          {navigation.map((item) => {
            const isActive = activeTab === item.label;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  onTabChange(item.label);
                  onClose?.();
                }}
                aria-current={isActive ? "page" : undefined}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors duration-150 ${
                  isActive
                    ? "bg-[#f1efff] text-[#5144d8]"
                    : "text-[#686e80] hover:bg-[#f7f8fb] hover:text-[#252a3b]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    isActive
                      ? "bg-[#6254e7]"
                      : "bg-[#d2d5df] group-hover:bg-[#9b9fb0]"
                  }`}
                />

                <span className="flex-1 text-[13px] font-medium">
                  {item.label}
                </span>

                <span
                  className={`font-mono text-[10px] ${
                    isActive ? "text-[#8177df]" : "text-[#b1b4c0]"
                  }`}
                >
                  {item.number}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[#ececf2] pt-5">
          <div className="rounded-xl border border-[#eeecff] bg-[#faf9ff] p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#6254e7] ring-1 ring-[#eeecff]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="M12 3.5 19 6.5V11.2C19 15.6 16.1 19.1 12 20.5 7.9 19.1 5 15.6 5 11.2V6.5L12 3.5Z"
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
              </span>

              <span className="text-xs font-semibold text-[#34304f]">
                Your privacy matters
              </span>
            </div>

            <p className="mt-3 text-[11px] leading-[1.7] text-[#77758e]">
              Medical data stays off-chain. Integrity and access permissions are
              recorded on Solana.
            </p>

            <div className="mt-3 flex items-center gap-2 border-t border-[#eeecff] pt-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3d9569]" />
              <span className="text-[10px] font-medium text-[#77758e]">
                Connected to Solana Devnet
              </span>
            </div>
          </div>

          <p className="mt-5 px-2 text-[10px] text-[#a1a5b1]">
            MEDTRUST · PATIENT-CONTROLLED RECORDS
          </p>
        </div>
      </aside>
    </>
  );
}
