import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type ToastType = "success" | "error" | "info";

export type ToastConfig = {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number; // ms, default 3000
  onHide: () => void;
};

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
  duration = 3000,
  onHide,
}: ToastConfig) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (timerRef.current) clearTimeout(timerRef.current);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 16,
          bounciness: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hide();
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, message]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onHide();
    });
  };

  if (!visible) return null;

  const palette = TOAST_STYLES[type];
  const { width } = Dimensions.get("window");
  const isMobile = width < 768;

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <Animated.View
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
        <Ionicons name={palette.icon} size={22} color={palette.iconColor} />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        <TouchableOpacity onPress={hide} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={18} color="#8A6F6F" />
        </TouchableOpacity>
      </Animated.View>
    </View>
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
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#2B1111",
    marginHorizontal: 10,
  },
});