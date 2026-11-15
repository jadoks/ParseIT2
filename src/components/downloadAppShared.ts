import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────
// 👇 PUT YOUR APK FILE ID HERE (the ONLY place you need to edit)
// Open the APK in Google Drive → ⋮ → Share → "Anyone with the link" →
// Copy link. It looks like:
//   https://drive.google.com/file/d/<FILE_ID>/view?usp=sharing
// Paste only the <FILE_ID> part below.
// (The FOLDER link can't be downloaded directly — it must be the FILE id.)
// ─────────────────────────────────────────────────────────────
const APK_FILE_ID = '1VYpY7psTjRYZgb5pxhuK995JblXGoSIC';
export const APK_DOWNLOAD_URL = `https://drive.google.com/uc?export=download&id=${APK_FILE_ID}`;

// ── Prompt timing / cooldown settings ────────────────────────
export const PROMPT_DELAY_MS = 45 * 1000; // show after ~45s of use
export const PROMPT_AUTO_HIDE_MS = 30 * 1000; // hide itself after 30s
const DAY_MS = 24 * 60 * 60 * 1000;
export const DISMISS_COOLDOWN_MS = 7 * DAY_MS; // tapped X → 7 days
export const IGNORED_COOLDOWN_MS = 1 * DAY_MS; // auto-hid untouched → 1 day

const STORAGE_KEY = 'parseclass-download-app-prompt-v1';
const SESSION_KEY = 'parseclass-download-app-prompt-session';

type StoredState = { snoozedUntil?: number; downloaded?: boolean };

const ls = (): Storage | null => {
  try {
    return Platform.OS === 'web' ? ((globalThis as any).localStorage ?? null) : null;
  } catch {
    return null;
  }
};
const ss = (): Storage | null => {
  try {
    return Platform.OS === 'web' ? ((globalThis as any).sessionStorage ?? null) : null;
  } catch {
    return null;
  }
};

const readState = (): StoredState => {
  try {
    const raw = ls()?.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
const writeState = (patch: StoredState) => {
  try {
    ls()?.setItem(STORAGE_KEY, JSON.stringify({ ...readState(), ...patch }));
  } catch {
    /* storage blocked (private mode) — fail silently */
  }
};

/** User tapped Download (header icon OR prompt) → never show the prompt again. */
export const markAppDownloaded = () => writeState({ downloaded: true });
/** Snooze the prompt for `ms`. */
export const snoozePrompt = (ms: number) => writeState({ snoozedUntil: Date.now() + ms });

/** Once per session (tab). */
export const wasShownThisSession = () => ss()?.getItem(SESSION_KEY) === '1';
export const markShownThisSession = () => {
  try {
    ss()?.setItem(SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
};

/** Has the user opted out for now (downloaded, or still in a cooldown)? */
export const isPromptSuppressed = (): boolean => {
  const s = readState();
  if (s.downloaded) return true;
  return !!s.snoozedUntil && Date.now() < s.snoozedUntil;
};

/**
 * APK install is only relevant on the web build, and not for iOS browsers.
 * (Anyone already inside the native app has Platform.OS !== 'web'.)
 */
export const canOfferApk = (): boolean => {
  if (Platform.OS !== 'web') return false;
  const nav: any = (globalThis as any).navigator;
  if (!nav) return true;
  const ua: string = nav.userAgent || '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ pretends to be a Mac but has a touch screen
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  return !isIOS;
};

/**
 * True only for devices with a real mouse (PC / laptop). Phones and tablets
 * report `hover: none`, so they get tap-to-download instead of a QR code.
 */
export const useCanHover = (): boolean => {
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  return canHover;
};