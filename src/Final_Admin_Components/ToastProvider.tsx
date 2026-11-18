import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Toast from "./Toast";

export type ToastType = "success" | "error" | "info";

type ShowToast = (message: string, type?: ToastType, onHide?: () => void) => void;

type ToastContextValue = {
  // Show a toast. It does NOT block the app: the user can keep tapping and
  // typing underneath. It closes by itself after a few seconds, or when the
  // user taps the X / swipes it up. Showing another toast replaces the
  // current one (and restarts the timer). If `onHide` is given, it runs when
  // the toast closes (navigate after "Account created", reset a form, ...).
  showToast: ShowToast;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

type ToastState = { visible: boolean; message: string; type: ToastType; id: number };

// ONE toast for the whole app. Mounted once in App.tsx, above every screen,
// so it survives switching screens, signing in/out, scrolling and focusing
// fields. It is drawn as a plain overlay (NOT inside a <Modal>), because a
// Modal captures every touch and would freeze the screen behind the toast.
// Trade-off: a toast can't draw above a native <Modal> that is already open.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
    id: 0,
  });
  const onHideRef = useRef<(() => void) | null>(null);

  const showToast = useCallback<ShowToast>((message, type = "success", onHide) => {
    onHideRef.current = onHide ?? null;
    setToast((prev) => ({ visible: true, message, type, id: prev.id + 1 }));
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
    const callback = onHideRef.current;
    onHideRef.current = null;
    if (callback) callback();
  }, []);

  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {/* Touch-through overlay: only the toast itself receives touches. */}
        <View style={styles.overlay} pointerEvents="box-none" collapsable={false}>
          <Toast
            visible={toast.visible}
            message={toast.message}
            type={toast.type}
            toastId={toast.id}
            onHide={hideToast}
          />
        </View>
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider> (mount it in App.tsx).");
  return ctx;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 20,
  },
});