import { audioRegistry, type AmbienceSoundId, type AudioCategory, type AudioSoundId, type MusicSoundId, type PlayableAudioCategory, type SfxSoundId, type UiSoundId } from "./audioRegistry";

export interface AudioSettings {
  enabled: boolean;
  masterVolume: number;
  uiVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  musicVolume: number;
}

interface LoopHandle {
  id: AudioSoundId;
  element?: HTMLAudioElement;
  fallbackTimer?: number;
}

interface LoopOptions {
  restart?: boolean;
  loop?: boolean;
}

const STORAGE_KEY = "gate99_audio_settings";

export const defaultAudioSettings: AudioSettings = {
  enabled: true,
  masterVolume: 0.8,
  uiVolume: 0.7,
  sfxVolume: 0.75,
  ambienceVolume: 0.45,
  musicVolume: 0.35,
};

const audioAssetUrls = import.meta.glob("../assets/audio/**/*.{mp3,ogg,wav,webm}", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

let audioContext: AudioContext | undefined;
let currentMusic: LoopHandle | undefined;
let currentAmbience: LoopHandle | undefined;
let audioUnlocked = false;
const elementCache = new Map<string, HTMLAudioElement>();
const warnedMissing = new Set<string>();
const debugLogOnceKeys = new Set<string>();

export function getAudioSettings(): AudioSettings {
  if (typeof window === "undefined") return defaultAudioSettings;
  try {
    if (!window.localStorage) return defaultAudioSettings;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAudioSettings;
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return normalizeAudioSettings(parsed);
  } catch {
    return defaultAudioSettings;
  }
}

export function saveAudioSettings(settings: Partial<AudioSettings>): AudioSettings {
  const next = normalizeAudioSettings({ ...getAudioSettings(), ...settings });
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Audio preferences are non-critical; gameplay should continue even if storage is unavailable.
    }
  }
  updateLoopVolumes(next);
  return next;
}

export function resetAudioSettings(): AudioSettings {
  return saveAudioSettings(defaultAudioSettings);
}

export function toggleMute(): AudioSettings {
  const current = getAudioSettings();
  return saveAudioSettings({ enabled: !current.enabled });
}

export function setVolume(category: AudioCategory, value: number): AudioSettings {
  const key = category === "master" ? "masterVolume" : `${category}Volume`;
  return saveAudioSettings({ [key]: clampVolume(value) } as Partial<AudioSettings>);
}

export function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  getAudioContext()?.resume().catch(() => undefined);
  if (import.meta.env.DEV) console.log("Audio unlocked");
}

export function playUiSound(soundId: UiSoundId) {
  playRegisteredSound(soundId);
}

export function playSfx(soundId: SfxSoundId) {
  playRegisteredSound(soundId);
}

export function playAmbience(soundId: AmbienceSoundId, options: LoopOptions = {}) {
  currentAmbience = playLoop(soundId, currentAmbience, options);
}

export function playMusic(soundId: MusicSoundId, options: LoopOptions = {}) {
  currentMusic = playLoop(soundId, currentMusic, options);
}

export function stopMusic() {
  stopLoop(currentMusic);
  currentMusic = undefined;
}

export function stopAmbience() {
  stopLoop(currentAmbience);
  currentAmbience = undefined;
}

export function stopAllAudio() {
  stopMusic();
  stopAmbience();
}

export function playDivineActionSound(actionId: string) {
  if (actionId === "blessing") playSfx("sfx_blessing");
  else if (actionId === "omen") playSfx("sfx_omen");
  else if (actionId === "whisper") playSfx("sfx_whisper");
  else if (actionId === "silence") playSfx("sfx_silence");
}

function normalizeAudioSettings(settings: Partial<AudioSettings>): AudioSettings {
  return {
    enabled: settings.enabled ?? defaultAudioSettings.enabled,
    masterVolume: normalizeVolume(settings.masterVolume, defaultAudioSettings.masterVolume),
    uiVolume: normalizeVolume(settings.uiVolume, defaultAudioSettings.uiVolume),
    sfxVolume: normalizeVolume(settings.sfxVolume, defaultAudioSettings.sfxVolume),
    ambienceVolume: normalizeVolume(settings.ambienceVolume, defaultAudioSettings.ambienceVolume),
    musicVolume: normalizeVolume(settings.musicVolume, defaultAudioSettings.musicVolume),
  };
}

function clampVolume(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function normalizeVolume(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? clampVolume(value) : fallback;
}

function getCategoryVolume(category: PlayableAudioCategory, multiplier = 1, settings = getAudioSettings()) {
  if (!settings.enabled) return 0;
  const categoryKey = `${category}Volume` as keyof AudioSettings;
  const categoryVolume = typeof settings[categoryKey] === "number" ? settings[categoryKey] : 1;
  return settings.masterVolume * categoryVolume * multiplier;
}

function playRegisteredSound(soundId: AudioSoundId) {
  const entry = audioRegistry[soundId];
  if (!entry) {
    logAudioDevOnce(`missing-entry-${soundId}`, `Missing audio registry entry: ${soundId}`);
    return;
  }
  const settings = getAudioSettings();
  const volume = getCategoryVolume(entry.category, entry.volumeMultiplier, settings);
  if (volume <= 0) {
    logAudioDevOnce(`muted-${soundId}`, `Sound skipped because audio is disabled or volume is zero: ${soundId}`);
    return;
  }

  const sourceUrl = resolveAudioUrl(entry.path);
  if (!sourceUrl) {
    logAudioDevOnce(`missing-source-${soundId}`, `No audio URL resolved for ${soundId}`);
    playFallbackSound(soundId, entry.category, volume);
    return;
  }

  const element = createOneShotAudioElement(sourceUrl);
  element.loop = false;
  element.volume = volume;
  element.currentTime = 0;
  logAudioDev(`Playing ${soundId}`);
  element.play().catch((error) => {
    warnAudioPlayFailed(soundId, error);
    playFallbackSound(soundId, entry.category, volume);
  });
}

function playLoop(soundId: AmbienceSoundId | MusicSoundId, current: LoopHandle | undefined, options: LoopOptions): LoopHandle | undefined {
  const entry = audioRegistry[soundId];
  if (!entry) return current;
  if (current?.id === soundId && !options.restart) {
    updateLoopVolumes();
    return current;
  }
  stopLoop(current);

  const settings = getAudioSettings();
  const volume = getCategoryVolume(entry.category, entry.volumeMultiplier, settings);
  if (volume <= 0) return { id: soundId };

  const sourceUrl = resolveAudioUrl(entry.path);
  if (!sourceUrl) {
    warnMissingAsset(entry.path);
    return { id: soundId };
  }

  const element = getAudioElement(sourceUrl);
  element.loop = options.loop ?? entry.loop ?? true;
  element.volume = volume;
  element.currentTime = 0;
  logAudioDev(`Playing ${soundId}`);
  element.play().catch((error) => warnAudioPlayFailed(soundId, error));
  return { id: soundId, element };
}

function stopLoop(handle?: LoopHandle) {
  if (handle?.fallbackTimer && typeof window !== "undefined") window.clearInterval(handle.fallbackTimer);
  if (handle?.element) {
    handle.element.pause();
    handle.element.currentTime = 0;
  }
}

function updateLoopVolumes(settings = getAudioSettings()) {
  if (currentMusic && !currentMusic.element) currentMusic = restartStoredLoop(currentMusic, settings) ?? currentMusic;
  if (currentAmbience && !currentAmbience.element) currentAmbience = restartStoredLoop(currentAmbience, settings) ?? currentAmbience;

  for (const handle of [currentMusic, currentAmbience]) {
    if (!handle?.element) continue;
    const entry = audioRegistry[handle.id];
    if (!entry) continue;
    handle.element.volume = getCategoryVolume(entry.category, entry.volumeMultiplier, settings);
    if (!settings.enabled) handle.element.pause();
    else if (handle.element.paused) handle.element.play().catch(() => undefined);
  }
}

function restartStoredLoop(handle: LoopHandle, settings: AudioSettings): LoopHandle | undefined {
  const entry = audioRegistry[handle.id];
  if (!entry) return handle;
  const volume = getCategoryVolume(entry.category, entry.volumeMultiplier, settings);
  if (volume <= 0) return handle;
  const sourceUrl = resolveAudioUrl(entry.path);
  if (!sourceUrl) {
    warnMissingAsset(entry.path);
    return handle;
  }
  const element = getAudioElement(sourceUrl);
  element.loop = entry.loop ?? true;
  element.volume = volume;
  element.currentTime = 0;
  logAudioDev(`Resuming ${handle.id}`);
  element.play().catch((error) => warnAudioPlayFailed(handle.id, error));
  return { id: handle.id, element };
}

function getAudioElement(sourceUrl: string) {
  const cached = elementCache.get(sourceUrl);
  if (cached) return cached;
  const element = new Audio(sourceUrl);
  element.preload = "auto";
  element.addEventListener("error", () => warnMissingAsset(sourceUrl), { once: true });
  elementCache.set(sourceUrl, element);
  return element;
}

function createOneShotAudioElement(sourceUrl: string) {
  const cached = getAudioElement(sourceUrl);
  const element = cached.cloneNode(true) as HTMLAudioElement;
  element.preload = "auto";
  element.addEventListener("error", () => warnMissingAsset(sourceUrl), { once: true });
  return element;
}

function resolveAudioUrl(path: string) {
  if (!path.startsWith("/assets/audio/")) return path;
  const normalized = path.replace(/^\/assets\/audio\//, "../assets/audio/");
  const match = Object.entries(audioAssetUrls).find(([key]) => key.endsWith(normalized.replace("../assets/audio/", "assets/audio/")) || key.endsWith(normalized));
  return match?.[1];
}

function warnMissingAsset(path: string) {
  if (!import.meta.env.DEV || warnedMissing.has(path)) return;
  warnedMissing.add(path);
  console.warn(`[audio] Missing or blocked audio asset: ${path}`);
}

function warnAudioPlayFailed(soundId: AudioSoundId, error: unknown) {
  if (!import.meta.env.DEV) return;
  if (isInterruptedPlay(error)) return;
  console.warn("[audio] Audio play failed:", soundId, error);
}

function isInterruptedPlay(error: unknown) {
  if (!(error instanceof DOMException)) return false;
  return error.name === "AbortError";
}

function logAudioDev(message: string) {
  if (!import.meta.env.DEV) return;
  console.log(`[audio] ${message}`);
}

function logAudioDevOnce(key: string, message: string) {
  if (!import.meta.env.DEV || debugLogOnceKeys.has(key)) return;
  debugLogOnceKeys.add(key);
  console.log(`[audio] ${message}`);
}

function getAudioContext() {
  if (typeof window === "undefined") return undefined;
  if (!audioContext) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return undefined;
    audioContext = new AudioContextCtor();
  }
  if (audioContext.state === "suspended") audioContext.resume().catch(() => undefined);
  return audioContext;
}

function playFallbackSound(soundId: AudioSoundId, category: PlayableAudioCategory, volume: number) {
  if (category === "ambience" || category === "music") return;
  const context = getAudioContext();
  if (!context) return;
  const pattern = getFallbackPattern(soundId);
  const now = context.currentTime;
  pattern.forEach((note, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = note.type;
    oscillator.frequency.setValueAtTime(note.frequency, now + note.delay + index * 0.015);
    gain.gain.setValueAtTime(0.0001, now + note.delay);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * note.level), now + note.delay + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + note.delay);
    oscillator.stop(now + note.delay + note.duration + 0.02);
  });
}

function getFallbackPattern(soundId: AudioSoundId) {
  const sine = "sine" as OscillatorType;
  const triangle = "triangle" as OscillatorType;
  const sawtooth = "sawtooth" as OscillatorType;
  if (soundId === "ui_hover") return [{ frequency: 620, duration: 0.045, delay: 0, level: 0.08, type: sine }];
  if (soundId === "ui_warning" || soundId === "sfx_critical") return [{ frequency: 116, duration: 0.16, delay: 0, level: 0.18, type: triangle }];
  if (soundId === "sfx_success") {
    return [
      { frequency: 330, duration: 0.1, delay: 0, level: 0.13, type: sine },
      { frequency: 494, duration: 0.16, delay: 0.08, level: 0.12, type: sine },
    ];
  }
  if (soundId === "sfx_failure") return [{ frequency: 96, duration: 0.18, delay: 0, level: 0.16, type: triangle }];
  if (soundId === "sfx_gate_open") return [{ frequency: 72, duration: 0.24, delay: 0, level: 0.15, type: sawtooth }];
  if (soundId === "sfx_coin") return [{ frequency: 880, duration: 0.08, delay: 0, level: 0.1, type: sine }];
  if (soundId === "sfx_item_use") return [{ frequency: 440, duration: 0.11, delay: 0, level: 0.1, type: triangle }];
  if (soundId === "sfx_journal") return [{ frequency: 240, duration: 0.12, delay: 0, level: 0.08, type: sine }];
  if (soundId === "sfx_rare_encounter") {
    return [
      { frequency: 140, duration: 0.18, delay: 0, level: 0.13, type: triangle },
      { frequency: 420, duration: 0.16, delay: 0.12, level: 0.08, type: sine },
    ];
  }
  if (soundId === "sfx_blessing") return [{ frequency: 528, duration: 0.18, delay: 0, level: 0.1, type: sine }];
  if (soundId === "sfx_omen") return [{ frequency: 196, duration: 0.18, delay: 0, level: 0.12, type: triangle }];
  if (soundId === "sfx_whisper") return [{ frequency: 310, duration: 0.08, delay: 0, level: 0.055, type: sine }];
  if (soundId === "sfx_silence") return [{ frequency: 82, duration: 0.12, delay: 0, level: 0.075, type: sine }];
  if (soundId === "ui_confirm") return [{ frequency: 360, duration: 0.09, delay: 0, level: 0.12, type: sine }];
  if (soundId === "ui_back" || soundId === "ui_tab") return [{ frequency: 260, duration: 0.07, delay: 0, level: 0.09, type: sine }];
  return [{ frequency: 220, duration: 0.065, delay: 0, level: 0.09, type: sine }];
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
