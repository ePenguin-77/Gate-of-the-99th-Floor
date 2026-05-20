import musicHubUrl from "../assets/audio/music/music_hub.wav";
import musicTitleUrl from "../assets/audio/music/music_title.wav";
import sfxFailureUrl from "../assets/audio/sfx/sfx_failure.ogg";
import sfxRareEncounterUrl from "../assets/audio/sfx/sfx_rare_encounter.ogg";
import sfxSuccessUrl from "../assets/audio/sfx/sfx_success.ogg";
import uiClickUrl from "../assets/audio/ui/ui_click.ogg";
import uiConfirmUrl from "../assets/audio/ui/ui_confirm.ogg";

export type AudioCategory = "master" | "ui" | "sfx" | "ambience" | "music";
export type PlayableAudioCategory = Exclude<AudioCategory, "master">;

export type UiSoundId = "ui_click" | "ui_hover" | "ui_tab" | "ui_back" | "ui_confirm" | "ui_warning";
export type SfxSoundId =
  | "sfx_success"
  | "sfx_failure"
  | "sfx_critical"
  | "sfx_rare_encounter"
  | "sfx_gate_open"
  | "sfx_coin"
  | "sfx_item_use"
  | "sfx_journal"
  | "sfx_blessing"
  | "sfx_omen"
  | "sfx_whisper"
  | "sfx_silence";
export type AmbienceSoundId = "ambience_title" | "ambience_hub" | "ambience_tower" | "ambience_rare";
export type MusicSoundId = "music_title" | "music_hub" | "music_tower_tension" | "music_floor10" | "music_floor20";
export type AudioSoundId = UiSoundId | SfxSoundId | AmbienceSoundId | MusicSoundId;

export interface AudioRegistryEntry {
  id: AudioSoundId;
  category: PlayableAudioCategory;
  path: string;
  volumeMultiplier: number;
  loop?: boolean;
}

export const audioRegistry: Record<AudioSoundId, AudioRegistryEntry> = {
  ui_click: { id: "ui_click", category: "ui", path: uiClickUrl, volumeMultiplier: 1, loop: false },
  ui_hover: { id: "ui_hover", category: "ui", path: "/assets/audio/ui/ui_hover.ogg", volumeMultiplier: 0.18 },
  ui_tab: { id: "ui_tab", category: "ui", path: "/assets/audio/ui/ui_tab.ogg", volumeMultiplier: 0.34 },
  ui_back: { id: "ui_back", category: "ui", path: "/assets/audio/ui/ui_back.ogg", volumeMultiplier: 0.3 },
  ui_confirm: { id: "ui_confirm", category: "ui", path: uiConfirmUrl, volumeMultiplier: 1, loop: false },
  ui_warning: { id: "ui_warning", category: "ui", path: "/assets/audio/ui/ui_warning.ogg", volumeMultiplier: 0.52 },

  sfx_success: { id: "sfx_success", category: "sfx", path: sfxSuccessUrl, volumeMultiplier: 1, loop: false },
  sfx_failure: { id: "sfx_failure", category: "sfx", path: sfxFailureUrl, volumeMultiplier: 1, loop: false },
  sfx_critical: { id: "sfx_critical", category: "sfx", path: "/assets/audio/sfx/sfx_critical.ogg", volumeMultiplier: 0.7 },
  sfx_rare_encounter: { id: "sfx_rare_encounter", category: "sfx", path: sfxRareEncounterUrl, volumeMultiplier: 1, loop: false },
  sfx_gate_open: { id: "sfx_gate_open", category: "sfx", path: "/assets/audio/sfx/sfx_gate_open.ogg", volumeMultiplier: 0.62 },
  sfx_coin: { id: "sfx_coin", category: "sfx", path: "/assets/audio/sfx/sfx_coin.ogg", volumeMultiplier: 0.42 },
  sfx_item_use: { id: "sfx_item_use", category: "sfx", path: "/assets/audio/sfx/sfx_item_use.ogg", volumeMultiplier: 0.48 },
  sfx_journal: { id: "sfx_journal", category: "sfx", path: "/assets/audio/sfx/sfx_journal.ogg", volumeMultiplier: 0.38 },
  sfx_blessing: { id: "sfx_blessing", category: "sfx", path: "/assets/audio/sfx/sfx_blessing.ogg", volumeMultiplier: 0.58 },
  sfx_omen: { id: "sfx_omen", category: "sfx", path: "/assets/audio/sfx/sfx_omen.ogg", volumeMultiplier: 0.56 },
  sfx_whisper: { id: "sfx_whisper", category: "sfx", path: "/assets/audio/sfx/sfx_whisper.ogg", volumeMultiplier: 0.46 },
  sfx_silence: { id: "sfx_silence", category: "sfx", path: "/assets/audio/sfx/sfx_silence.ogg", volumeMultiplier: 0.5 },

  ambience_title: { id: "ambience_title", category: "ambience", path: "/assets/audio/ambience/ambience_title.ogg", volumeMultiplier: 0.8, loop: true },
  ambience_hub: { id: "ambience_hub", category: "ambience", path: "/assets/audio/ambience/ambience_hub.ogg", volumeMultiplier: 0.85, loop: true },
  ambience_tower: { id: "ambience_tower", category: "ambience", path: "/assets/audio/ambience/ambience_tower.ogg", volumeMultiplier: 0.9, loop: true },
  ambience_rare: { id: "ambience_rare", category: "ambience", path: "/assets/audio/ambience/ambience_rare.ogg", volumeMultiplier: 0.88, loop: true },

  music_title: { id: "music_title", category: "music", path: musicTitleUrl, volumeMultiplier: 1, loop: true },
  music_hub: { id: "music_hub", category: "music", path: musicHubUrl, volumeMultiplier: 1, loop: true },
  music_tower_tension: { id: "music_tower_tension", category: "music", path: "/assets/audio/music/music_tower_tension.ogg", volumeMultiplier: 0.72, loop: true },
  music_floor10: { id: "music_floor10", category: "music", path: "/assets/audio/music/music_floor10.ogg", volumeMultiplier: 0.78, loop: true },
  music_floor20: { id: "music_floor20", category: "music", path: "/assets/audio/music/music_floor20.ogg", volumeMultiplier: 0.78, loop: true },
};
