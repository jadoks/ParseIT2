import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { FONT_BODY, WEIGHT_EMPHASIS } from '../theme/typography';
import {
  APK_DOWNLOAD_URL,
  PROMPT_AUTO_HIDE_MS,
  canOfferApk,
  markAppDownloaded,
  useCanHover,
} from './downloadAppShared';

/**
 * 📲 DownloadAppPrompt — top-right overlay inside the screen content area.
 *
 * Mount as the LAST child of the content container (same layer as the
 * Dashboard / Profile / Community screens), not in the header:
 *   <DownloadAppPrompt enabled={...} />
 *
 * - Opens on EVERY page load (after a short OPEN_DELAY_MS), once per load.
 * - Folds into a small semi-transparent tab when the user taps/clicks outside
 *   the card, scrolls the page, swipes, or presses Esc. It also folds itself
 *   after PROMPT_AUTO_HIDE_MS (paused while the mouse is over the card).
 * - The tab is always available (unless native app / iOS) to reopen it.
 * - It always opens on load, even after a download or an old snooze.
 * - Mouse devices: QR card. Touch devices: DOWNLOAD pill.
 */

type Props = {
  /** false on games/quizzes/full-page screens: hides without counting as a dismissal. */
  enabled: boolean;
  delayMs?: number;
  autoHideMs?: number;
};

const BRAND = '#8B0000';
const OPEN_DELAY_MS = 1200; // let the page paint first
const GRACE_MS = 700; // ignore scroll/touch noise right after opening
const SWIPE_THRESHOLD_PX = 12;
const CARD_MAX_WIDTH = 320;
const EDGE_GAP = 12;

const DownloadAppPrompt: React.FC<Props> = ({
  enabled,
  delayMs = OPEN_DELAY_MS,
  autoHideMs = PROMPT_AUTO_HIDE_MS,
}) => {
  const { width } = useWindowDimensions();
  const canHover = useCanHover(); // true = PC/laptop → QR card, false = touch → pill
  const [open, setOpen] = useState(false);
  // The card is only in the DOM while open/animating. A hidden card parked
  // off-screen to the right widens the page and shifts fixed overlays (modals).
  const [cardMounted, setCardMounted] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tabHover, setTabHover] = useState(false);
  const autoOpenedOnce = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;

  // Native app / iOS: never render anything.
  const available = useRef(canOfferApk()).current;
  // Auto-open on EVERY load. (Old snooze/"downloaded" flags in localStorage
  // are deliberately ignored, so they can't block the card anymore.)
  const autoEligible = available;
  const [delayDone, setDelayDone] = useState(false);
  const openedAt = useRef(0);
  const cardRef = useRef<any>(null);

  const cardWidth = Math.min(CARD_MAX_WIDTH, Math.max(200, width - EDGE_GAP * 2));
  const small = width < 600;
  const qrSize = small ? 112 : 140;
  const top = small ? 8 : EDGE_GAP;

  useEffect(() => {
    if (open) setCardMounted(true);
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      // Soft ease: quick start then a long gentle landing when opening,
      // slow-in / slow-out when folding away.
      duration: open ? 380 : 480,
      easing: open ? Easing.out(Easing.cubic) : Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !open) setCardMounted(false);
    });
  }, [open, progress]);

  // 1) wait for the delay
  useEffect(() => {
    if (!autoEligible) return;
    const t = setTimeout(() => setDelayDone(true), delayMs);
    return () => clearTimeout(t);
  }, [autoEligible, delayMs]);

  // 2) auto-open once per load, as soon as the current screen allows it
  useEffect(() => {
    if (autoEligible && delayDone && enabled && !autoOpenedOnce.current) {
      autoOpenedOnce.current = true;
      setOpen(true);
    }
  }, [autoEligible, delayDone, enabled]);

  // 3) screen no longer allowed → fold quietly (no cooldown)
  useEffect(() => {
    if (open && !enabled) {
      setOpen(false);
      setHovering(false);
    }
  }, [open, enabled]);

  const hide = useCallback(() => {
    setOpen(false);
    setHovering(false);
  }, []);

  // 4) auto-hide (paused while the mouse is over the card)
  useEffect(() => {
    if (!open || hovering) return;
    const t = setTimeout(hide, autoHideMs);
    return () => clearTimeout(t);
  }, [open, hovering, autoHideMs, hide]);

  // Esc, tap/click outside, scroll/wheel, or swipe → fold into the tab
  useEffect(() => {
    if (!open || Platform.OS !== 'web' || typeof document === 'undefined') return;
    openedAt.current = Date.now();
    const inside = (t: any) => !!(cardRef.current && t && cardRef.current.contains?.(t));
    const grace = () => Date.now() - openedAt.current < GRACE_MS;
    let startX = 0;
    let startY = 0;

    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide();
    const onPointerDown = (e: any) => {
      if (!grace() && !inside(e.target)) hide();
    };
    // Keyboard scrolling (Space / arrows / Page Up/Down / Home / End)
    const onScrollKey = (e: KeyboardEvent) => {
      if (grace() || inside(e.target)) return;
      if ([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) hide();
    };
    const onWheel = (e: any) => {
      if (!grace() && !inside(e.target)) hide();
    };
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0]?.clientX ?? 0;
      startY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (grace() || inside(e.target)) return;
      const t = e.touches[0];
      if (!t) return;
      if (Math.abs(t.clientX - startX) > SWIPE_THRESHOLD_PX || Math.abs(t.clientY - startY) > SWIPE_THRESHOLD_PX) {
        hide();
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onScrollKey);
    document.addEventListener('wheel', onWheel, { capture: true, passive: true });
    document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onScrollKey);
      document.removeEventListener('wheel', onWheel, true);
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('touchmove', onTouchMove, true);
    };
  }, [open, hide]);

  const handleDownload = () => {
    markAppDownloaded(); // recorded for your other code; no longer blocks the auto-open
    setOpen(false);
    Linking.openURL(APK_DOWNLOAD_URL).catch(() => {});
  };

  if (!available || !enabled || Platform.OS !== 'web') return null;

  const hover = (on: () => void, off: () => void) =>
    ({ onHoverIn: on, onHoverOut: off } as any);

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      {/* ───────── Expanded card ───────── */}
      {cardMounted && (
      <Animated.View
        ref={cardRef}
        pointerEvents={open ? 'auto' : 'none'}
        style={[
          styles.cardWrap,
          {
            top,
            right: EDGE_GAP,
            width: cardWidth,
            // fades out a little ahead of the slide so it dissolves as it glides away
            opacity: progress.interpolate({
              inputRange: [0, 0.6, 1],
              outputRange: [0, 0.85, 1],
            }),
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [cardWidth + EDGE_GAP * 2, 0],
                }),
              },
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.94, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          style={styles.card}
          {...hover(() => setHovering(true), () => setHovering(false))}
        >
          <View style={styles.cardHeader}>
            <View style={styles.iconBubble}>
              <MaterialCommunityIcons name="android" size={22} color={BRAND} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title} numberOfLines={1}>Download App</Text>
              <Text style={styles.sub} numberOfLines={1}>ParseIT Hub for Android</Text>
            </View>
            <Pressable
              onPress={hide}
              hitSlop={8}
              accessibilityLabel="Hide download prompt"
              style={styles.hideBtn}
            >
              <MaterialCommunityIcons name="chevron-right" size={22} color="#65676B" />
            </Pressable>
          </View>

          {canHover ? (
            <View style={styles.qrBlock}>
              <View style={styles.qrBox}>
                <QRCode value={APK_DOWNLOAD_URL} size={qrSize} color="#000" backgroundColor="#FFF" />
              </View>
              <Text style={styles.hint}>Scan with your Android phone</Text>
             
            </View>
          ) : (
            <Pressable
              onPress={handleDownload}
              accessibilityRole="button"
              accessibilityLabel="Download the Android app"
              style={({ pressed }) => [styles.pill, pressed && { opacity: 0.85 }]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.pillTitle}>DOWNLOAD</Text>
                <Text style={styles.pillSub} numberOfLines={1}>ParseIT Hub .apk</Text>
              </View>
              <View style={styles.pillIcon}>
                <MaterialCommunityIcons name="download" size={24} color={BRAND} />
              </View>
            </Pressable>
          )}
        </Pressable>
      </Animated.View>
      )}

      {/* ───────── Hidden state: small see-through tab ───────── */}
      <Animated.View
        pointerEvents={open ? 'none' : 'box-none'}
        style={[
          styles.tabWrap,
          {
            top,
            // the tab fades/slides in during the last part of the fold-away
            opacity: progress.interpolate({
              inputRange: [0, 0.35, 1],
              outputRange: [1, 0, 0],
            }),
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 0.35],
                  outputRange: [0, 14],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        {canHover && tabHover && !open && (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>Download app</Text>
          </View>
        )}
        <Pressable
          onPress={() => {
            setOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Show download app prompt"
          {...hover(() => setTabHover(true), () => setTabHover(false))}
          style={[styles.tab, { opacity: tabHover ? 1 : 0.5 }]}
        >
          <MaterialCommunityIcons name="download" size={20} color="#FFF" />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.16,
  shadowRadius: 14,
  elevation: 12,
};

const styles = StyleSheet.create({
  // Clips everything (incl. the slide-in animation) to the content area so
  // nothing can ever stick out and make the page wider than the screen.
  layer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', zIndex: 60, elevation: 60 },
  cardWrap: { position: 'absolute', zIndex: 60, elevation: 60 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    ...shadow,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F7EDED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#111' },
  sub: { fontSize: 12, fontFamily: FONT_BODY, color: '#888', marginTop: 1 },
  hideBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBlock: { alignItems: 'center', marginTop: 12 },
  qrBox: {
    padding: 8,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  hint: { marginTop: 8, fontSize: 12, fontFamily: FONT_BODY, color: '#333' },
  link: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONT_BODY,
    color: BRAND,
    textDecorationLine: 'underline',
  },
  pill: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND,
    borderRadius: 28,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 10,
  },
  pillTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: WEIGHT_EMPHASIS,
    fontFamily: FONT_BODY,
    letterSpacing: 0.5,
  },
  pillSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: FONT_BODY, marginTop: 1 },
  pillIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabWrap: {
    position: 'absolute',
    right: 0,
    zIndex: 60,
    elevation: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    width: 34,
    height: 44,
    backgroundColor: BRAND,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltip: {
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  tooltipText: { color: '#FFF', fontSize: 12, fontFamily: FONT_BODY },
});

export default DownloadAppPrompt;