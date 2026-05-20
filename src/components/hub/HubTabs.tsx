export type HubTabId = "overview" | "prepare" | "recover" | "develop" | "market" | "city" | "journal";

interface HubTabsProps {
  activeTab: HubTabId;
  onChange: (tab: HubTabId) => void;
}

const tabs: { id: HubTabId; label: string }[] = [
  { id: "overview", label: "ภาพรวม" },
  { id: "prepare", label: "เตรียมตัว" },
  { id: "recover", label: "ฟื้นตัว" },
  { id: "develop", label: "พัฒนา" },
  { id: "market", label: "ตลาด" },
  { id: "city", label: "เมือง" },
  { id: "journal", label: "บันทึก" },
];

export function HubTabs({ activeTab, onChange }: HubTabsProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-2 shadow-xl shadow-black/20">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              data-audio-id="ui_tab"
              onClick={() => onChange(tab.id)}
              className={`relative min-h-11 shrink-0 rounded-xl px-4 text-sm font-semibold transition ${
                active ? "bg-ember-300/15 text-ember-100" : "text-stone-400 hover:bg-white/[0.06] hover:text-stone-100"
              }`}
            >
              {tab.label}
              {active ? <span className="absolute inset-x-4 bottom-1 h-0.5 rounded-full bg-ember-300" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
