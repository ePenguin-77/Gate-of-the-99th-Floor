import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { getAudioSettings, playSfx, playUiSound, resetAudioSettings, saveAudioSettings, setVolume, toggleMute, type AudioSettings } from "../../game/audioSystem";
import type { AudioCategory } from "../../game/audioRegistry";

const sliders: { category: AudioCategory; label: string; key: keyof AudioSettings }[] = [
  { category: "master", label: "ระดับเสียงทั้งหมด", key: "masterVolume" },
  { category: "ui", label: "เสียงเมนู", key: "uiVolume" },
  { category: "sfx", label: "เสียงเหตุการณ์", key: "sfxVolume" },
  { category: "ambience", label: "เสียงบรรยากาศ", key: "ambienceVolume" },
  { category: "music", label: "เพลงประกอบ", key: "musicVolume" },
];

export function AudioSettingsPanel() {
  const [settings, setSettings] = useState<AudioSettings>(() => getAudioSettings());

  function handleToggleMute() {
    setSettings(toggleMute());
  }

  function handleVolume(category: AudioCategory, value: number) {
    setSettings(setVolume(category, value));
  }

  function handleEnable(enabled: boolean) {
    setSettings(saveAudioSettings({ enabled }));
  }

  function handleResetSettings() {
    setSettings(resetAudioSettings());
    playUiSound("ui_confirm");
  }

  return (
    <section className="rounded-2xl border border-ember-300/20 bg-black/30 p-5 shadow-xl shadow-black/25 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-serif text-3xl text-stone-50">เสียง</p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-400">
            ปรับระดับเสียงของเมนู เหตุการณ์ บรรยากาศ และเพลงประกอบ การตั้งค่านี้จะถูกบันทึกไว้ในเครื่องของคุณ
          </p>
          <p className="mt-1 text-xs leading-5 text-stone-500">เสียงทั้งหมดจะเริ่มหลังจากผู้เล่นกดหรือแตะหน้าจอครั้งแรก</p>
        </div>
        <button
          type="button"
          data-audio-id={settings.enabled ? "ui_back" : "ui_confirm"}
          onClick={handleToggleMute}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-ember-300/40 hover:bg-ember-300/10"
          aria-label={settings.enabled ? "ปิดเสียง" : "เปิดเสียง"}
        >
          {settings.enabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          {settings.enabled ? "เปิดเสียง" : "ปิดเสียง"}
        </button>
      </div>

      <label className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-stone-200">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) => handleEnable(event.target.checked)}
          className="h-4 w-4 accent-amber-400"
        />
        {settings.enabled ? "เปิดเสียง" : "ปิดเสียง"}
      </label>

      <div className="mt-5 grid gap-5">
        {sliders.map((slider) => (
          <label key={slider.category} className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <span className="flex items-center justify-between gap-3 text-sm text-stone-300">
              <span className="font-semibold text-stone-100">{slider.label}</span>
              <span className="text-ember-200">{Math.round((settings[slider.key] as number) * 100)}%</span>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings[slider.key] as number}
              onChange={(event) => handleVolume(slider.category, Number(event.target.value))}
              className="h-2 w-full cursor-pointer accent-amber-400"
            />
          </label>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-ember-300/15 bg-ember-950/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-serif text-2xl text-stone-50">ทดสอบเสียง</p>
            <p className="mt-1 text-sm leading-6 text-stone-400">ใช้ตรวจว่าไฟล์เสียงจริงและระดับเสียงทำงานถูกต้อง</p>
          </div>
          <button
            type="button"
            data-audio-silent="true"
            onClick={handleResetSettings}
            className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-stone-200 transition hover:border-ember-300/40 hover:bg-ember-300/10"
          >
            รีเซ็ตการตั้งค่าเสียง
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AudioTestButton label="ทดสอบเสียงกด" onClick={() => playUiSound("ui_click")} />
          <AudioTestButton label="ทดสอบเสียงยืนยัน" onClick={() => playUiSound("ui_confirm")} />
          <AudioTestButton label="ทดสอบเสียงสำเร็จ" onClick={() => playSfx("sfx_success")} />
          <AudioTestButton label="ทดสอบเสียงล้มเหลว" onClick={() => playSfx("sfx_failure")} />
          <AudioTestButton label="ทดสอบเสียงเหตุการณ์ผิดปกติ" onClick={() => playSfx("sfx_rare_encounter")} />
        </div>
      </div>
    </section>
  );
}

function AudioTestButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-audio-silent="true"
      onClick={onClick}
      className="min-h-11 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm font-semibold text-stone-100 transition hover:border-ember-300/40 hover:bg-ember-300/10"
    >
      {label}
    </button>
  );
}
