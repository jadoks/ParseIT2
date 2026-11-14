import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
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
  // Close when the user taps/clicks anywhere outside the toast. Default false.
  // Turn this on ONLY where <Toast> is rendered inside a full-screen transparent
  // <Modal> portal (the `toastPortal` pattern): a Modal captures every touch
  // anyway, so the tap catcher just gives the user a way out. Where <Toast> is
  // rendered inline in a screen (no Modal), leave it off so the app behind the
  // toast stays fully usable. The tap that dismisses is consumed by the Modal,
  // so the user taps once to close and again to act.
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

const TOAST_STYLES: Record<
  ToastType,
  { bg: string; border: string; iconColor: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  success: { bg: "#F0FDF4", border: "#BBF7D0", iconColor: "#059669", icon: "checkmark-circle" },
  error: { bg: "#FFF1F2", border: "#F5C2C7", iconColor: "#DC2626", icon: "alert-circle" },
  info: { bg: "#EFF6FF", border: "#BFDBFE", iconColor: "#2563EB", icon: "information-circle" },
};

export default function Toast({
  visible,
  message,
  type = "success",
  duration,
  dismissOnOutsideTouch,
  onHide,
}: ToastConfig) {
  const resolvedDuration = duration ?? DEFAULT_DURATION_BY_TYPE[type];
  const outsideDismiss = dismissOnOutsideTouch ?? false;
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const translateY = useRef(new Animated.Value(HIDDEN_Y)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRef = useRef<any>(null);
  const hidingRef = useRef(false);

  // Keep latest values in refs so the stable callbacks below never go stale.
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;
  const durationRef = useRef(resolvedDuration);
  durationRef.current = resolvedDuration;

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
    Animated.parallel([
      Animated.timing(translateY, { toValue: HIDDEN_Y, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => {
      hidingRef.current = false;
      if (finished) onHideRef.current();
    });
  }, [clearTimer, translateY, opacity]);

  const startTimer = useCallback(
    (ms: number) => {
      clearTimer();
      timerRef.current = setTimeout(hide, ms);
    },
    [clearTimer, hide]
  );

  // Show + auto-dismiss. Re-runs when the message changes so a new toast
  // replacing an old one restarts its timer.
  useEffect(() => {
    if (visible) {
      hidingRef.current = false;

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 16,
          bounciness: 8,
        }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();

      startTimer(durationRef.current);
    }
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, message, type]);

  // Swipe up to dismiss (touch on phone/tablet, mouse drag on web).
  // Only claims the gesture for a mostly-vertical drag, so a plain tap on
  // the toast or its close button still works normally.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => clearTimer(),
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) translateY.setValue(g.dy); // follow upward drags only
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -SWIPE_DISTANCE || g.vy < -SWIPE_VELOCITY) {
          hide();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          startTimer(RESUME_DURATION);
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        startTimer(RESUME_DURATION);
      },
    })
  ).current;

  // Web only: pause the timer while hovering over the toast.
  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;
    const node = toastRef.current;
    const onEnter = () => clearTimer();
    const onLeave = () => startTimer(RESUME_DURATION);
    node?.addEventListener?.("mouseenter", onEnter);
    node?.addEventListener?.("mouseleave", onLeave);
    return () => {
      node?.removeEventListener?.("mouseenter", onEnter);
      node?.removeEventListener?.("mouseleave", onLeave);
    };
  }, [visible, clearTimer, startTimer]);

  if (!visible) return null;

  const palette = TOAST_STYLES[type];

  return (
    <>
      {/* Full-screen tap catcher behind the toast. Only enabled (opt-in) for Modal
          portal call sites, where the parent is a full-screen layer. */}
      {outsideDismiss && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={hide}
          accessible={false}
          importantForAccessibility="no"
        />
      )}
      <View pointerEvents="box-none" style={styles.container}>
      <Animated.View
        ref={toastRef}
        {...panResponder.panHandlers}
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion={type === "error" ? "assertive" : "polite"}
        style={[
          styles.toast,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            transform: [{ translateY }],
            opacity,
            maxWidth: isMobile ? width - 32 : 420,
          },
        ]}
      >
        {/* Tapping anywhere on the toast closes it. */}
        <Pressable
          onPress={hide}
          style={styles.content}
          accessibilityLabel={`${message}. Tap to dismiss.`}
        >
          <Ionicons name={palette.icon} size={22} color={palette.iconColor} />
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
          <View
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close notification"
          >
            <Ionicons name="close" size={18} color="#8A6F6F" />
          </View>
        </Pressable>
      </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "web" ? 20 : 50,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    elevation: 20,
  },
  toast: {
    borderWidth: 1,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#2B1111",
    marginHorizontal: 10,
  },
});