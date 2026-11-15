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
    DISMISS_COOLDOWN_MS,
    IGNORED_COOLDOWN_MS,
    PROMPT_AUTO_HIDE_MS,
    PROMPT_DELAY_MS,
    canOfferApk,
    isPromptSuppressed,
    markAppDownloaded,
    markShownThisSession,
    snoozePrompt,
    useCanHover,
    wasShownThisSession,
} from './downloadAppShared';

/**
 * 📲 DownloadAppPrompt — top-right overlay inside the screen content area.
 *
 * Mount as the LAST child of the content container (same layer as the
 * Dashboard / Profile / Community screens), not in the header:
 *   <DownloadAppPrompt enabled={...} />
 *
 * - Opens by itself once per session after PROMPT_DELAY_MS, folds into a
 *   small semi-transparent tab after PROMPT_AUTO_HIDE_MS (paused on hover).
 * - The tab is always available (unless native app / iOS) to reopen it.
 * - Hide (chevron / Esc) → DISMISS_COOLDOWN_MS; ignored → IGNORED_COOLDOWN_MS;
 *   Download → never auto-opens again. Cooldowns only stop the AUTO-open.
 * - Mouse devices: QR card. Touch devices: DOWNLOAD pill.
 */

type Props = {
  /** false on games/quizzes/full-page screens: hides without counting as a dismissal. */
  enabled: boolean;
  delayMs?: number;
  autoHideMs?: number;
};

const BRAND = '#8B0000';
const CARD_MAX_WIDTH = 320;
const EDGE_GAP = 12;

const DownloadAppPrompt: React.FC<Props> = ({
  enabled,
  delayMs = PROMPT_DELAY_MS,
  autoHideMs = PROMPT_AUTO_HIDE_MS,
}) => {
  const { width } = useWindowDimensions();
  const canHover = useCanHover(); // true = PC/laptop → QR card, false = touch → pill
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tabHover, setTabHover] = useState(false);
  const autoOpened = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;

  // Native app / iOS: never render anything.
  const available = useRef(canOfferApk()).current;
  // Auto-open eligibility (downloaded / cooldown / already shown this session).
  const autoEligible = useRef(
    available && !isPromptSuppressed() && !wasShownThisSession()
  ).current;
  const [delayDone, setDelayDone] = useState(false);

  const cardWidth = Math.min(CARD_MAX_WIDTH, Math.max(200, width - EDGE_GAP * 2));
  const small = width < 600;
  const qrSize = small ? 112 : 140;
  const top = small ? 8 : EDGE_GAP;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [open, progress]);

  // 1) wait for the delay
  useEffect(() => {
    if (!autoEligible) return;
    const t = setTimeout(() => setDelayDone(true), delayMs);
    return () => clearTimeout(t);
  }, [autoEligible, delayMs]);

  // 2) auto-open once, only when the current screen allows it
  useEffect(() => {
    if (autoEligible && delayDone && enabled && !open && !wasShownThisSession()) {
      markShownThisSession();
      autoOpened.current = true;
      setOpen(true);
    }
  }, [autoEligible, delayDone, enabled, open]);

  // 3) screen no longer allowed → fold quietly (no cooldown)
  useEffect(() => {
    if (open && !enabled) {
      setOpen(false);
      setHovering(false);
    }
  }, [open, enabled]);

  const hide = useCallback((reason: 'user' | 'auto') => {
    setOpen(false);
    setHovering(false);
    if (reason === 'user') snoozePrompt(DISMISS_COOLDOWN_MS);
    else if (autoOpened.current) snoozePrompt(IGNORED_COOLDOWN_MS);
    autoOpened.current = false;
  }, []);

  // 4) auto-hide (paused while the mouse is over the card)
  useEffect(() => {
    if (!open || hovering) return;
    const t = setTimeout(() => hide('auto'), autoHideMs);
    return () => clearTimeout(t);
  }, [open, hovering, autoHideMs, hide]);

  // Esc hides
  useEffect(() => {
    if (!open || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide('user');
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, hide]);

  const handleDownload = () => {
    markAppDownloaded(); // never auto-opens again
    markShownThisSession();
    autoOpened.current = false;
    setOpen(false);
    Linking.openURL(APK_DOWNLOAD_URL).catch(() => {});
  };

  if (!available || !enabled || Platform.OS !== 'web') return null;

  const hover = (on: () => void, off: () => void) =>
    ({ onHoverIn: on, onHoverOut: off } as any);

  return (
    <>
      {/* ───────── Expanded card ───────── */}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[
          styles.cardWrap,
          {
            top,
            right: EDGE_GAP,
            width: cardWidth,
            opacity: progress,
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [cardWidth + EDGE_GAP * 2, 0],
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
              onPress={() => hide('user')}
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
              <Pressable onPress={handleDownload} accessibilityRole="link">
                <Text style={styles.link}>or download the .apk here</Text>
              </Pressable>
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

      {/* ───────── Hidden state: small see-through tab ───────── */}
      <Animated.View
        pointerEvents={open ? 'none' : 'box-none'}
        style={[
          styles.tabWrap,
          {
            top,
            opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
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
            autoOpened.current = false;
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
    </>
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