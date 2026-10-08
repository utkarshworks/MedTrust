"use client";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigation = [
  "Overview",
  "Medical Records",
  "Access Control",
  "Activity",
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="hidden w-[240px] shrink-0 border-r border-[#e8e9f0] bg-white px-5 py-7 lg:block">
      <div className="mb-12 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6254e7] text-sm font-bold text-white">
          M
        </div>

        <span className="text-lg font-semibold tracking-tight">MedTrust</span>
      </div>

      <nav className="space-y-1">
        {navigation.map((item) => (
          <button
            key={item}
            onClick={() => onTabChange(item)}
            className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
              activeTab === item
                ? "bg-[#f0efff] text-[#5144d8]"
                : "text-[#696b7a] hover:bg-[#f7f7fa] hover:text-[#171827]"
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-10">
        <div className="rounded-2xl bg-[#f7f6ff] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8178d9]">
            Your records
          </p>

          <p className="mt-2 text-sm leading-5 text-[#5e6070]">
            Your medical data stays off-chain. MedTrust records its integrity
            and access permissions securely.
          </p>
        </div>
      </div>
    </aside>
  );
}
