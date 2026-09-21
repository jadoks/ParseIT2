import React from 'react';
import {
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FONT_TITLE } from '../theme/typography';

/**
 * AuthWaveHeader
 * ──────────────
 * Wave-shaped header used by the SMALL-SCREEN layouts of SignIn and Register.
 *
 *   variant="compact"  → one brand-red wave      (Register)
 *   variant="layered"  → deep-maroon → red bands (SignIn)
 *
 * The wave is a single anti-aliased alpha mask (embedded below as a data-URI,
 * so there is no asset to place and no react-native-svg dependency). It is
 * stretched to the header size and recoloured with `tintColor`; the layered
 * bands are the same mask shifted upward in darker tints. To change the
 * curve, regenerate the mask (script at the bottom of this file).
 *
 * Place this file in the SAME folder as SignIn.tsx / Register.tsx — it uses
 * the same relative imports (../theme/typography, ../../assets/images/logo.png).
 */

// ── Palette (same reds / ink already used by SignIn + Register) ─────────────
const BRAND = '#8B0000';
const BRAND_MID = '#6E0000'; // halfway between BRAND and BRAND_DEEP
const BRAND_DEEP = '#500000'; // the maroon already used for the logo shadow
const INK = '#111827';

type Variant = 'compact' | 'layered';

interface AuthWaveHeaderProps {
  /** Large heading that sits under the crest of the wave. */
  title: string;
  variant?: Variant;
  /** Tapping the logo tile (e.g. go back to the landing page). */
  onLogoPress?: () => void;
}

// Back-to-front. `shift` moves that copy of the mask up (px), leaving the
// previous layer visible as a band just above the wave's edge.
const LAYERS: Record<Variant, { color: string; shift: number }[]> = {
  compact: [{ color: BRAND, shift: 0 }],
  layered: [
    { color: BRAND, shift: 0 },
    { color: BRAND_MID, shift: 22 },
    { color: BRAND_DEEP, shift: 44 },
  ],
};

const BODY_HEIGHT: Record<Variant, number> = {
  compact: 175,
  layered: 215,
};

export default function AuthWaveHeader({
  title,
  variant = 'compact',
  onLogoPress,
}: AuthWaveHeaderProps) {
  const topInset =
    Platform.OS === 'ios'
      ? 50
      : Platform.OS === 'android'
      ? (StatusBar.currentHeight ?? 24) + 10
      : 24;

  const height = BODY_HEIGHT[variant] + topInset;

  return (
    <View style={[styles.header, { height }]}>
      {LAYERS[variant].map((layer) => (
        <Image
          key={layer.color}
          source={WAVE_MASK}
          resizeMode="stretch"
          accessible={false}
          style={{
            position: 'absolute',
            left: 0,
            top: -layer.shift,
            width: '100%',
            height,
            tintColor: layer.color,
          }}
        />
      ))}

      <View style={styles.overlay} pointerEvents="box-none">
        <View
          style={[styles.overlayInner, { paddingTop: topInset }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.logoTile}
            onPress={onLogoPress}
            disabled={!onLogoPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Back to the landing page"
          >
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  // Same 420dp column the form uses, so the title lines up with the fields
  // on wider "small-screen" devices (tablets in portrait, web).
  overlayInner: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 24,
    paddingBottom: 14,
    justifyContent: 'space-between',
  },
  logoTile: {
    alignSelf: 'flex-start',
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_DEEP,
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  logoImage: { width: 32, height: 32 },
  title: {
    fontFamily: FONT_TITLE,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: INK,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave mask (900×368 PNG, white + alpha, ~5.6 KB). Regenerate with:
//
//   python3 generate_wave.py   (delivered alongside this file)
//   → writes wave_mask.b64; paste its contents into WAVE_MASK_B64 below
//
// Boundary: f(u) = tilt(u) − A·exp(−((u − 0.60)/s)²), s = 0.34 left / 0.17 right
// (u = 0..1 across the width; y = fraction of header height).
// ─────────────────────────────────────────────────────────────────────────────
const WAVE_MASK_B64 = [
  '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'
];

// Defined after the data above so it is initialised before first render.
const WAVE_MASK = { uri: 'data:image/png;base64,' + WAVE_MASK_B64.join('') };