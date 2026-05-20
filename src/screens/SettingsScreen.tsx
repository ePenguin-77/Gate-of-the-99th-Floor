import { ArrowLeft, Gamepad2, Monitor, Settings, Volume2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { AudioSettingsPanel } from "../components/settings/AudioSettingsPanel";

type SettingsTabId = "audio" | "display" | "game";

const tabs: { id: SettingsTabId; label: string; icon: typeof Volume2 }[] = [
  { id: "audio", label: "เสียง", icon: Volume2 },
  { id: "display", label: "การแสดงผล", icon: Monitor },
  { id: "game", label: "เกม", icon: Gamepad2 },
];

interface Props {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("audio");

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8 text-stone-100 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-[0.18em] text-ember-300">ตั้งค่า</p>
          <h1 className="mt-1 font-serif text-4xl text-stone-50 sm:text-5xl">ตั้งค่า</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-400">ปรับเสียง การแสดงผล และประสบการณ์การเล่น</p>
        </div>
        <Button variant="ghost" onClick={onBack} className="rounded-xl">
          <ArrowLeft size={16} /> กลับเมืองพักพิง
        </Button>
      </header>

      <Panel className="rounded-2xl border-white/10 bg-black/35 p-3 shadow-2xl shadow-black/30 sm:p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-audio-id="ui_tab"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-ember-300/50 bg-ember-300/15 text-ember-100 shadow-lg shadow-ember-950/20"
                    : "border-white/10 bg-white/[0.04] text-stone-300 hover:border-ember-300/30 hover:bg-white/[0.08] hover:text-stone-100"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </Panel>

      <section className="mt-5">
        {activeTab === "audio" ? <AudioSettingsPanel /> : null}
        {activeTab === "display" ? <DisplaySettingsPlaceholder /> : null}
        {activeTab === "game" ? <GameSettingsPlaceholder /> : null}
      </section>
    </main>
  );
}

function DisplaySettingsPlaceholder() {
  return (
    <Panel className="rounded-2xl border-white/10 bg-black/30 p-6 shadow-xl shadow-black/25">
      <div className="flex items-start gap-3">
        <Monitor className="mt-1 text-ember-200" size={22} />
        <div>
          <h2 className="font-serif text-3xl text-stone-50">การแสดงผล</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-400">ตัวเลือกด้านภาพจะถูกเพิ่มในภายหลัง</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <SettingRow label="ความเข้มของพื้นหลัง" value="เร็วๆ นี้" />
        <SettingRow label="ขนาดตัวอักษร" value="เร็วๆ นี้" />
      </div>
    </Panel>
  );
}

function GameSettingsPlaceholder() {
  return (
    <Panel className="rounded-2xl border-white/10 bg-black/30 p-6 shadow-xl shadow-black/25">
      <div className="flex items-start gap-3">
        <Settings className="mt-1 text-ember-200" size={22} />
        <div>
          <h2 className="font-serif text-3xl text-stone-50">เกม</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-400">ตัวเลือกการเล่นเพิ่มเติมจะถูกเพิ่มในภายหลัง</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <SettingRow label="ระดับความยาก" value="ใช้ค่าปัจจุบันจากระบบเกม" />
        <SettingRow label="รีเซ็ตคำแนะนำ" value="เร็วๆ นี้" />
      </div>
    </Panel>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm font-semibold text-stone-100">{label}</p>
      <p className="mt-1 text-sm text-stone-500">{value}</p>
    </div>
  );
}
