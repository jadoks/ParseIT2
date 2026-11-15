import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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

type Props = {
  /**
   * Parent decides which screens are OK (e.g. home/classes yes, games/quizzes no).
   * If this turns false while the prompt is open, it hides without counting
   * as a dismissal.
   */
  enabled: boolean;
  delayMs?: number;
  autoHideMs?: number;
};

const BRAND = '#8B0000';

const DownloadAppPrompt: React.FC<Props> = ({
  enabled,
  delayMs = PROMPT_DELAY_MS,
  autoHideMs = PROMPT_AUTO_HIDE_MS,
}) => {
  const canHover = useCanHover(); // true = PC/laptop → QR card, false = touch → button banner
  const [ready, setReady] = useState(false); // delay elapsed
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  // Skip entirely: native app, iOS, already downloaded, in cooldown, or already shown this session.
  const eligible = useRef(
    canOfferApk() && !isPromptSuppressed() && !wasShownThisSession()
  ).current;

  // 1) wait ~45s of use before it can appear
  useEffect(() => {
    if (!eligible) return;
    const t = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(t);
  }, [eligible, delayMs]);

  // 2) show only when the delay is over AND the current screen allows it
  useEffect(() => {
    if (eligible && ready && enabled && !visible && !wasShownThisSession()) {
      setVisible(true);
    }
  }, [eligible, ready, enabled, visible]);

  // 3) user navigated to a game/quiz/etc → hide quietly (no cooldown, may return later)
  useEffect(() => {
    if (visible && !enabled) setVisible(false);
  }, [visible, enabled]);

  // fade/slide in
  useEffect(() => {
    if (!visible) {
      anim.setValue(0);
      return;
    }
    Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: false }).start();
  }, [visible, anim]);

  // 4) auto-hide after ~30s untouched → 1-day snooze, not shown again this session
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      snoozePrompt(IGNORED_COOLDOWN_MS);
      markShownThisSession();
      setVisible(false);
    }, autoHideMs);
    return () => clearTimeout(t);
  }, [visible, autoHideMs]);

  if (!visible || Platform.OS !== 'web') return null;

  const handleClose = () => {
    snoozePrompt(DISMISS_COOLDOWN_MS); // X → 7 days
    markShownThisSession();
    setVisible(false);
  };

  const handleDownload = () => {
    markAppDownloaded(); // never again
    markShownThisSession();
    setVisible(false);
    Linking.openURL(APK_DOWNLOAD_URL).catch(() => {});
  };

  const animStyle = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  // 👇 PC / laptop: QR card, bottom-right
  if (canHover) {
    return (
      <Animated.View style={[styles.cardDesktop, fixed, animStyle]}>
        <Pressable onPress={handleClose} style={styles.closeBtn} accessibilityLabel="Dismiss">
          <MaterialCommunityIcons name="close" size={18} color="#65676B" />
        </Pressable>
        <Text style={styles.title}>Get the ParseClass app</Text>
        <Text style={styles.sub}>Scan with your Android phone</Text>
        <View style={styles.qrBox}>
          <QRCode value={APK_DOWNLOAD_URL} size={140} color="#000" backgroundColor="#FFF" />
        </View>
        <Pressable onPress={handleDownload} accessibilityRole="link">
          <Text style={styles.link}>or download the .apk here</Text>
        </Pressable>
      </Animated.View>
    );
  }

  // 👇 phone / tablet: button banner, bottom
  return (
    <Animated.View style={[styles.bannerMobile, fixed, animStyle]}>
      <View style={styles.bannerIcon}>
        <MaterialCommunityIcons name="android" size={22} color={BRAND} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>Get the ParseClass app</Text>
        <Text style={styles.bannerSub}>Faster and easier on Android</Text>
      </View>
      <Pressable onPress={handleDownload} style={styles.bannerBtn} accessibilityRole="button">
        <Text style={styles.bannerBtnText}>Download</Text>
      </Pressable>
      <Pressable onPress={handleClose} style={styles.bannerClose} accessibilityLabel="Dismiss">
        <MaterialCommunityIcons name="close" size={18} color="#65676B" />
      </Pressable>
    </Animated.View>
  );
};

// web-only: stay pinned to the viewport regardless of the parent layout
const fixed: any = { position: 'fixed', zIndex: 9999 };

const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.18,
  shadowRadius: 16,
  elevation: 12,
};

const styles = StyleSheet.create({
  cardDesktop: {
    right: 24,
    bottom: 24,
    width: 230,
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
    ...shadow,
  } as any,
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: WEIGHT_EMPHASIS,
    fontFamily: FONT_BODY,
    color: '#111',
    marginTop: 4,
    paddingHorizontal: 14,
    textAlign: 'center',
  },
  sub: { fontSize: 12, fontFamily: FONT_BODY, color: '#888', marginTop: 2, marginBottom: 12 },
  qrBox: { padding: 8, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  link: { marginTop: 12, fontSize: 12, fontFamily: FONT_BODY, color: BRAND, textDecorationLine: 'underline' },

  bannerMobile: {
    left: 12,
    right: 12,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 6,
    borderWidth: 1,
    borderColor: '#EEE',
    gap: 10,
    ...shadow,
  } as any,
  bannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F7EDED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { fontSize: 14, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#111' },
  bannerSub: { fontSize: 12, fontFamily: FONT_BODY, color: '#888', marginTop: 1 },
  bannerBtn: { backgroundColor: BRAND, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  bannerBtnText: { color: '#FFF', fontSize: 13, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY },
  bannerClose: { padding: 8 },
});

export default DownloadAppPrompt;