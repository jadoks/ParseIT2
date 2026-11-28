import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type ToastType = "success" | "error" | "info";

export type ToastConfig = {
  visible: boolean;
  message: string;
  type?: ToastType;
  // ms; if omitted, defaults by type — errors stay up longer (5500ms) so
  // there's time to actually read them, success/info dismiss sooner (4000ms).
  duration?: number;
  // Default false: the toast auto-closes after `duration` (the thin line at the
  // bottom of the toast shows the time left). Set true to keep it on screen
  // until the user swipes it up or taps the X.
  persistent?: boolean;
  // Bump this number on every new toast. It restarts the timer and animation
  // even when the new message is identical to the one already showing.
  toastId?: number;
  // Close when the user taps/clicks anywhere outside the toast. Default false.
  // Only turn this on where <Toast> is rendered inside a full-screen layer that
  // already captures touches. Leave it off otherwise, so the app behind the
  // toast stays fully usable.
  dismissOnOutsideTouch?: boolean;
  onHide: () => void;
};

// Default on-screen time per toast type, used whenever a call site doesn't
// pass an explicit `duration`.
const DEFAULT_DURATION_BY_TYPE: Record<ToastType, number> = {
  success: 4000,
  error: 5500,
  info: 4000,
};

// How long the toast stays after the user stops hovering / lets go of a
// swipe that didn't dismiss it.
const RESUME_DURATION = 2000;

// Upward drag distance (px) or speed that counts as a "swipe to dismiss".
const SWIPE_DISTANCE = 30;
const SWIPE_VELOCITY = 0.5;

const HIDDEN_Y = -80;
const HIDDEN_SCALE = 0.96;

// JS-driven animations (useNativeDriver: false). The toast is small, and the native
// driver can leave a re-mounted Animated.View stuck invisible on Android.

// One quiet surface for every type; only the icon disc and the time line carry the
// status colour, so the toast matches the app's white cards and warm borders.
const TONES: Record<
  ToastType,
  { disc: string; accent: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  success: { disc: "#E3F4EA", accent: "#1E8E4E", icon: "checkmark" },
  error: { disc: "#FCE8E8", accent: "#C62828", icon: "alert" },
  info: { disc: "#E6EEFB", accent: "#2457C5", icon: "information" },
};

const topOffset = () => {
  if (Platform.OS === "web") return 20;
  if (Platform.OS === "android") return (StatusBar.currentHeight ?? 24) + 10;
  return 56;
};

export default function Toast({
  visible,
  message,
  type = "success",
  duration,
  persistent = false,
  toastId,
  dismissOnOutsideTouch,
  onHide,
}: ToastConfig) {
  const resolvedDuration = duration ?? DEFAULT_DURATION_BY_TYPE[type];
  const outsideDismiss = dismissOnOutsideTouch ?? false;
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const translateY = useRef(new Animated.Value(HIDDEN_Y)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(HIDDEN_SCALE)).current;
  const progress = useRef(new Animated.Value(0)).current; // 0 = just shown, 1 = time is up
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRef = useRef<any>(null);
  const hidingRef = useRef(false);

  // Keep latest values in refs so the stable callbacks below never go stale.
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;
  const durationRef = useRef(resolvedDuration);
  durationRef.current = resolvedDuration;
  // PanResponder callbacks are created once, so they read this ref instead
  // of the prop.
  const persistentRef = useRef(persistent);
  persistentRef.current = persistent;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    if (hidingRef.current) return;
    hidingRef.current = true;
    clearTimer();
    progress.stopAnimation();
    Animated.parallel([
      Animated.timing(translateY, { toValue: HIDDEN_Y, duration: 200, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(scale, { toValue: HIDDEN_SCALE, duration: 200, useNativeDriver: false }),
    ]).start(({ finished }) => {
      hidingRef.current = false;
      if (finished) onHideRef.current();
    });
  }, [clearTimer, progress, translateY, opacity, scale]);

  // Runs the auto-close timer and the matching time line together.
  const startCountdown = useCallback(
    (ms: number, fromStart = false) => {
      clearTimer();
      progress.stopAnimation();
      if (fromStart) progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: ms,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
      timerRef.current = setTimeout(hide, ms);
    },
    [clearTimer, hide, progress]
  );

  // Freeze the countdown while the user is touching / hovering the toast.
  const pauseCountdown = useCallback(() => {
    clearTimer();
    progress.stopAnimation();
  }, [clearTimer, progress]);

  // Show + auto-dismiss. Re-runs when the message changes (or toastId is bumped) so
  // a new toast replacing an old one restarts its timer.
  useEffect(() => {
    if (visible) {
      hidingRef.current = false;

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: false,
          speed: 16,
          bounciness: 6,
        }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: false, speed: 16, bounciness: 6 }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: false }),
      ]).start();

      progress.setValue(0);
      if (!persistentRef.current) startCountdown(durationRef.current, true);
    }
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, message, type, toastId]);

  // Swipe up to dismiss (touch on phone/tablet, mouse drag on web).
  // Only claims the gesture for a mostly-vertical drag, so a plain tap on
  // the toast or its close button still works normally.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => pauseCountdown(),
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) translateY.setValue(g.dy); // follow upward drags only
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -SWIPE_DISTANCE || g.vy < -SWIPE_VELOCITY) {
          hide();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: false }).start();
          if (!persistentRef.current) startCountdown(RESUME_DURATION);
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: false }).start();
        if (!persistentRef.current) startCountdown(RESUME_DURATION);
      },
    })
  ).current;

  // Web only: pause the countdown while hovering over the toast. Not needed when
  // the toast is persistent (there is no timer to pause).
  useEffect(() => {
    if (!visible || Platform.OS !== "web" || persistent) return;
    const node = toastRef.current;
    const onEnter = () => pauseCountdown();
    const onLeave = () => startCountdown(RESUME_DURATION);
    node?.addEventListener?.("mouseenter", onEnter);
    node?.addEventListener?.("mouseleave", onLeave);
    return () => {
      node?.removeEventListener?.("mouseenter", onEnter);
      node?.removeEventListener?.("mouseleave", onLeave);
    };
  }, [visible, persistent, pauseCountdown, startCountdown]);

  if (!visible) return null;

  const tone = TONES[type];
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["100%", "0%"] });

  return (
    <>
      {/* Full-screen tap catcher behind the toast. Opt-in only. */}
      {outsideDismiss && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={hide}
          accessible={false}
          importantForAccessibility="no"
        />
      )}
      <View
        pointerEvents="box-none"
        collapsable={false}
        style={[styles.container, { top: topOffset() }]}
      >
        <Animated.View
          ref={toastRef}
          collapsable={false}
          {...panResponder.panHandlers}
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion={type === "error" ? "assertive" : "polite"}
          style={[
            styles.shadow,
            {
              opacity,
              transform: [{ translateY }, { scale }],
              // Native needs a definite width: the message Text is flex: 1, and inside a
              // shrink-wrapped box it collapses to 0 (icon + X, no text). Web can size to content.
              ...(Platform.OS === "web"
                ? { maxWidth: isMobile ? width - 32 : 420, minWidth: 280 }
                : { width: Math.min(width - 32, 420) }),
            },
          ]}
        >
          <View style={styles.card} accessibilityLabel={message}>
            <View style={styles.row}>
              <View style={[styles.disc, { backgroundColor: tone.disc }]}>
                <Ionicons name={tone.icon} size={18} color={tone.accent} />
              </View>
              <Text style={styles.message} numberOfLines={3}>
                {message}
              </Text>
              {/* Only the X button (or a swipe up) closes the toast early. */}
              <Pressable
                onPress={hide}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Close notification"
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={16} color="#8A6F6F" />
              </Pressable>
            </View>
            {/* Time line: drains while the toast is on screen, so the user can see
                when it will close. Hidden for persistent toasts. */}
            {!persistent && (
              <View style={styles.track}>
                <Animated.View style={[styles.bar, { backgroundColor: tone.accent, width: barWidth }]} />
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    elevation: 20,
  },
  // Shadow lives on its own view: overflow: "hidden" on the same view would clip it on iOS.
  shadow: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#4A0000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EBD4D4",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 10,
  },
  disc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
    color: "#2B1111",
    marginHorizontal: 12,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FAF5F5",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
  },
  track: {
    height: 3,
    backgroundColor: "#F6ECEC",
  },
  bar: {
    height: 3,
  },
});