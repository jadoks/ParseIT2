import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────
// SHARED TYPOGRAPHY TOKENS
// Only two font families are used across the app:
//   - FONT_TITLE  → titles, page headers, card headers
//   - FONT_BODY   → everything else (sub-headings, sub-titles, labels,
//                   body text, buttons) — Roboto on web/Android, which is
//                   also Android's native system font.
// No custom font files are required: on native this resolves to the
// platform's built-in sans-serif, and on web it pulls system-installed
// Roboto/Arial with a generic sans-serif fallback.
// ─────────────────────────────────────────────────────────────────────────

export const FONT_TITLE = Platform.select({
  web: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const FONT_BODY = Platform.select({
  web: 'Roboto, Arial, sans-serif',
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

// Weight scale — keep it to two tiers so text hierarchy comes from size
// and color, not from stacking heavier and heavier bold weights.
export const WEIGHT_TITLE = '700' as const; // page/section titles only
export const WEIGHT_EMPHASIS = '600' as const; // labels, values, sub-titles, buttons
export const WEIGHT_BODY = '400' as const; // paragraphs, helper text

export default {
  FONT_TITLE,
  FONT_BODY,
  WEIGHT_TITLE,
  WEIGHT_EMPHASIS,
  WEIGHT_BODY,
};