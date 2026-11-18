import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import Toast from "./Toast";

export type ToastType = "success" | "error" | "info";

type ShowToast = (message: string, type?: ToastType, onHide?: () => void) => void;

type ToastContextValue = {
  // Show a toast. It stays until the user swipes it up or taps the X.
  // If `onHide` is given, it runs when the toast closes AND the toast uses
  // the timed auto-dismiss instead, so flows that advance on close
  // (navigate after "Account created", reset a form, ...) never get stuck.
  showToast: ShowToast;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

type ToastState = { visible: boolean; message: string; type: ToastType; persistent: boolean };

// ONE toast for the whole app. Mounted once in App.tsx, above every screen,
// so it survives switching screens, signing in/out, scrolling and focusing
// fields. Rendered in a transparent Modal so it also sits above other modals.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
    persistent: true,
  });
  const onHideRef = useRef<(() => void) | null>(null);

  const showToast = useCallback<ShowToast>((message, type = "success", onHide) => {
    onHideRef.current = onHide ?? null;
    setToast({ visible: true, message, type, persistent: !onHide });
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
      {children}
      <Modal
        visible={toast.visible}
        transparent
        animationType="fade"
        onRequestClose={hideToast}
        statusBarTranslucent
      >
        <View style={styles.portal} pointerEvents="box-none">
          <Toast
            persistent={toast.persistent}
            visible={toast.visible}
            message={toast.message}
            type={toast.type}
            onHide={hideToast}
          />
        </View>
      </Modal>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider> (mount it in App.tsx).");
  return ctx;
}

const styles = StyleSheet.create({
  // Lets touches pass through to whatever's behind, except the toast itself.
  portal: {
    ...StyleSheet.absoluteFillObject,
  },
});