import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ✅ Reuses the same Toast component used across the app (Chatbot/Register/
// Admin/Teacher screens, Community, Dashboard, ClassesScreen, SignIn)
// instead of inline alert-style banners, so feedback looks and behaves
// consistently.
import Toast from "../Final_Admin_Components/Toast"; // adjust path if your folder layout differs

type ToastType = "success" | "error" | "info";

type CurrentAdminInfo = {
  adminId: string;
  email: string;
  firstName?: string;
};

type SettingsProps = {
  width: number;
  onClose?: () => void;
  apiBaseUrl: string;
  currentAdmin: CurrentAdminInfo;
  onEmailUpdated?: (newEmail: string) => void;
};

type PinInputProps = {
  value: string[];
  onChange: (index: number, text: string) => void;
  isMobile: boolean;
  disabled?: boolean;
};

// Keep in sync with getPasswordPolicyError in server.js — length alone let
// weak passwords like "password" or "12345678" through. Requires at least
// one uppercase letter, one lowercase letter, one number, and one special
// character on top of the 8-character minimum. Returns an error message if
// the password is too weak, or null if it passes.
function getPasswordPolicyError(password: string): string | null {
  const value = (password || "").trim();
  const REQUIREMENT_MESSAGE =
    "Password must be at least 8 characters, and include an uppercase letter, a lowercase letter, a number, and a special character.";

  if (
    value.length < 8 ||
    !/[A-Z]/.test(value) ||
    !/[a-z]/.test(value) ||
    !/[0-9]/.test(value) ||
    !/[^A-Za-z0-9]/.test(value)
  ) {
    return REQUIREMENT_MESSAGE;
  }

  return null;
}

function PinInput({ value, onChange, isMobile, disabled }: PinInputProps) {
  const refs = useRef<Array<TextInput | null>>([]);

  return (
    <View style={styles.pinContainer}>
      <View style={[styles.pinRow, isMobile && styles.pinRowMobile]}>
        {value.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              refs.current[index] = ref;
            }}
            value={digit}
            editable={!disabled}
            onChangeText={(text) => {
              const cleanText = text.replace(/[^0-9]/g, "").slice(-1);
              onChange(index, cleanText);

              if (cleanText && index < 3) {
                refs.current[index + 1]?.focus();
              }
            }}
            onKeyPress={({ nativeEvent }) => {
              if (
                nativeEvent.key === "Backspace" &&
                !value[index] &&
                index > 0
              ) {
                refs.current[index - 1]?.focus();
              }
            }}
            keyboardType="number-pad"
            maxLength={1}
            style={[
              styles.pinBox,
              isMobile && styles.pinBoxMobile,
              disabled && styles.inputDisabled,
            ]}
            textAlign="center"
            textAlignVertical="center"
          />
        ))}
      </View>
    </View>
  );
}

export default function Settings({
  width,
  onClose,
  apiBaseUrl,
  currentAdmin,
  onEmailUpdated,
}: SettingsProps) {
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;

  const apiFetch = (url: string, options: any = {}) =>
    fetch(url, {
      credentials: "include",
      ...options,
    });

  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(true);
  const [isChangeEmailModalVisible, setIsChangeEmailModalVisible] =
    useState(false);
  const [isChangePasswordModalVisible, setIsChangePasswordModalVisible] =
    useState(false);

  // ✅ Toast state — same shape/usage as Chatbot/Register/SignIn/Community/
  // Dashboard, replacing the old inline alert-style banners.
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
  }>({ visible: false, message: "", type: "success" });

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  // ─── Change Email state ───────────────────────────────────────────────
  const [changeEmailStep, setChangeEmailStep] = useState(1);
  const [changeEmailPin, setChangeEmailPin] = useState(["", "", "", ""]);
  const [newEmail, setNewEmail] = useState("");
  const [changeEmailLoading, setChangeEmailLoading] = useState(false);
  const [changeEmailSendingCode, setChangeEmailSendingCode] = useState(false);
  const [changeEmailCodeSent, setChangeEmailCodeSent] = useState(false);

  // ─── Change Password state ────────────────────────────────────────────
  const [changePasswordStep, setChangePasswordStep] = useState(1);
  const [passwordEmail, setPasswordEmail] = useState(currentAdmin?.email || "");
  const [changePasswordPin, setChangePasswordPin] = useState(["", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetChangeEmailModal = () => {
    setChangeEmailStep(1);
    setChangeEmailPin(["", "", "", ""]);
    setNewEmail("");
    setChangeEmailLoading(false);
    setChangeEmailSendingCode(false);
    setChangeEmailCodeSent(false);
    setIsChangeEmailModalVisible(false);
  };

  const resetChangePasswordModal = () => {
    setChangePasswordStep(1);
    setPasswordEmail(currentAdmin?.email || "");
    setChangePasswordPin(["", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
    setChangePasswordLoading(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsChangePasswordModalVisible(false);
  };

  const handleChangeEmailPinChange = (index: number, text: string) => {
    const updated = [...changeEmailPin];
    updated[index] = text;
    setChangeEmailPin(updated);
  };

  const handleChangePasswordPinChange = (index: number, text: string) => {
    const updated = [...changePasswordPin];
    updated[index] = text;
    setChangePasswordPin(updated);
  };

  // ─── Change Email handlers ────────────────────────────────────────────
  const openChangeEmailModal = () => {
    setIsChangeEmailModalVisible(true);
    void sendChangeEmailPin();
  };

  const sendChangeEmailPin = async () => {
    if (!currentAdmin?.email) {
      showToast("Your account has no email on file. Contact support.", "error");
      return;
    }

    setChangeEmailSendingCode(true);

    try {
      const res = await apiFetch(`${apiBaseUrl}/auth/send-forgot-password-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentAdmin.email }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send verification code.");
      }

      setChangeEmailCodeSent(true);
    } catch (error: any) {
      showToast(error?.message || "Failed to send verification code.", "error");
    } finally {
      setChangeEmailSendingCode(false);
    }
  };

  const verifyChangeEmailPin = async () => {
    const pin = changeEmailPin.join("");

    if (pin.length !== 4) {
      showToast("Please enter the 4-digit code.", "error");
      return;
    }

    setChangeEmailLoading(true);

    try {
      const res = await apiFetch(`${apiBaseUrl}/auth/verify-forgot-password-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentAdmin.email, pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Invalid or expired code.");
      }

      setChangeEmailStep(2);
    } catch (error: any) {
      showToast(error?.message || "Invalid or expired code.", "error");
    } finally {
      setChangeEmailLoading(false);
    }
  };

  const submitNewEmail = async () => {
    const trimmedEmail = newEmail.trim();

    if (!trimmedEmail) {
      showToast("Please enter your new email address.", "error");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }

    setChangeEmailLoading(true);

    try {
      const res = await apiFetch(`${apiBaseUrl}/auth/change-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentAdmin.adminId,
          role: "admin",
          newEmail: trimmedEmail,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update email.");
      }

      showToast("Email updated successfully.", "success");
      onEmailUpdated?.(data?.data?.email || trimmedEmail);

      setTimeout(() => {
        resetChangeEmailModal();
      }, 1200);
    } catch (error: any) {
      showToast(error?.message || "Failed to update email.", "error");
    } finally {
      setChangeEmailLoading(false);
    }
  };

  // ─── Change Password handlers ─────────────────────────────────────────
  const sendChangePasswordPin = async () => {
    const trimmedEmail = passwordEmail.trim();

    if (!trimmedEmail) {
      showToast("Please enter your email address.", "error");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }

    setChangePasswordLoading(true);

    try {
      const res = await apiFetch(`${apiBaseUrl}/auth/send-forgot-password-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send verification code.");
      }

      setChangePasswordStep(2);
    } catch (error: any) {
      showToast(error?.message || "Failed to send verification code.", "error");
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const verifyChangePasswordPin = async () => {
    const pin = changePasswordPin.join("");

    if (pin.length !== 4) {
      showToast("Please enter the 4-digit code.", "error");
      return;
    }

    setChangePasswordLoading(true);

    try {
      const res = await apiFetch(`${apiBaseUrl}/auth/verify-forgot-password-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: passwordEmail.trim(), pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Invalid or expired code.");
      }

      setChangePasswordStep(3);
    } catch (error: any) {
      showToast(error?.message || "Invalid or expired code.", "error");
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const submitNewPassword = async () => {
    const passwordPolicyError = getPasswordPolicyError(newPassword);
    if (passwordPolicyError) {
      showToast(passwordPolicyError, "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }

    setChangePasswordLoading(true);

    try {
      const res = await apiFetch(`${apiBaseUrl}/auth/reset-forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: passwordEmail.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update password.");
      }

      showToast("Password updated successfully.", "success");

      setTimeout(() => {
        resetChangePasswordModal();
      }, 1200);
    } catch (error: any) {
      showToast(error?.message || "Failed to update password.", "error");
    } finally {
      setChangePasswordLoading(false);
    }
  };

  // Live password strength checks — mirrors getPasswordPolicyError's rules,
  // broken out per-requirement so each one can show its own checkmark as
  // the admin types instead of only surfacing a single pass/fail message
  // on submit.
  const passwordChecks = [
    { label: "At least 8 characters", passed: newPassword.trim().length >= 8 },
    { label: "One uppercase letter", passed: /[A-Z]/.test(newPassword) },
    { label: "One lowercase letter", passed: /[a-z]/.test(newPassword) },
    { label: "One number", passed: /[0-9]/.test(newPassword) },
    { label: "One special character", passed: /[^A-Za-z0-9]/.test(newPassword) },
  ];
  const isNewPasswordValid = passwordChecks.every((check) => check.passed);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const settingsCardWidth = isMobile ? "100%" : isTablet ? "74%" : "42%";
  const childModalWidth = isMobile ? "100%" : isTablet ? "68%" : "36%";

  return (
    <>
      <Modal
        visible={isSettingsModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsSettingsModalVisible(false)}
          />

          <View
            style={[
              styles.modalCard,
              { width: settingsCardWidth },
              isMobile && styles.modalCardMobile,
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalIconBox,
                    isMobile && styles.modalIconBoxMobile,
                  ]}
                >
                  <Feather name="settings" size={22} color="#DC2626" />
                </View>

                <View style={styles.modalHeaderTextWrap}>
                  <Text style={[styles.modalTitle, isMobile && styles.modalTitleMobile]}>
                    Settings
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Manage your account settings and security options.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setIsSettingsModalVisible(false);
                  onClose?.();
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color="#7A4A4A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.modalContent,
                isMobile && styles.modalContentMobile,
              ]}
            >
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeaderRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color="#DC2626"
                  />
                  <Text style={styles.modalSectionTitle}>
                    Account & Security
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.85}
                  onPress={openChangeEmailModal}
                >
                  <View style={styles.actionCardLeft}>
                    <View style={styles.smallIconBox}>
                      <Ionicons name="mail-outline" size={18} color="#DC2626" />
                    </View>

                    <View style={styles.actionCardTextWrap}>
                      <Text style={styles.actionCardTitle}>Change Email</Text>
                      <Text style={styles.actionCardSubtitle}>
                        Verify PIN first, then update your email address.
                      </Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.85}
                  onPress={() => setIsChangePasswordModalVisible(true)}
                >
                  <View style={styles.actionCardLeft}>
                    <View style={styles.smallIconBox}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={18}
                        color="#DC2626"
                      />
                    </View>

                    <View style={styles.actionCardTextWrap}>
                      <Text style={styles.actionCardTitle}>Change Password</Text>
                      <Text style={styles.actionCardSubtitle}>
                        Enter email, verify PIN, then set a new password.
                      </Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View
              style={[
                styles.modalFooter,
                isMobile && styles.modalFooterMobileSingle,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.modalSecondaryButton,
                  isMobile && styles.fullWidthButton,
                ]}
                onPress={() => {
                  setIsSettingsModalVisible(false);
                  onClose?.();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSecondaryButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── CHANGE EMAIL MODAL ─────────────────────────────────────────── */}
      <Modal
        visible={isChangeEmailModalVisible}
        animationType="fade"
        transparent
        onRequestClose={resetChangeEmailModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={resetChangeEmailModal}
          />

          <View
            style={[
              styles.modalCardSmall,
              { width: childModalWidth },
              isMobile && styles.modalCardMobile,
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalIconBox,
                    isMobile && styles.modalIconBoxMobile,
                  ]}
                >
                  <Ionicons name="mail-outline" size={22} color="#DC2626" />
                </View>

                <View style={styles.modalHeaderTextWrap}>
                  <Text style={[styles.modalTitle, isMobile && styles.modalTitleMobile]}>
                    Change Email
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Step {changeEmailStep} of 2
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={resetChangeEmailModal}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color="#7A4A4A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.modalContent,
                isMobile && styles.modalContentMobile,
              ]}
            >
              {changeEmailStep === 1 && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="key-outline" size={18} color="#DC2626" />
                    <Text style={styles.modalSectionTitle}>Enter PIN Code</Text>
                  </View>

                  <Text style={styles.helperText}>
                    {changeEmailSendingCode
                      ? `Sending a 4-digit code to ${currentAdmin?.email || "your email"}...`
                      : `Enter the 4-digit PIN code sent to ${currentAdmin?.email || "your existing email"}.`}
                  </Text>

                  <PinInput
                    value={changeEmailPin}
                    onChange={handleChangeEmailPinChange}
                    isMobile={isMobile}
                    disabled={changeEmailSendingCode || changeEmailLoading}
                  />

                  <TouchableOpacity
                    onPress={sendChangeEmailPin}
                    disabled={changeEmailSendingCode}
                    activeOpacity={0.85}
                    style={styles.resendLinkWrap}
                  >
                    <Text style={styles.resendLinkText}>
                      {changeEmailSendingCode
                        ? "Sending code..."
                        : changeEmailCodeSent
                        ? "Didn't get a code? Resend"
                        : "Send verification code"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {changeEmailStep === 2 && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons
                      name="mail-open-outline"
                      size={18}
                      color="#DC2626"
                    />
                    <Text style={styles.modalSectionTitle}>New Email</Text>
                  </View>

                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="mail-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={newEmail}
                      onChangeText={setNewEmail}
                      placeholder="Enter new email address"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!changeEmailLoading}
                    />
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, isMobile && styles.modalFooterMobile]}>
              {changeEmailStep > 1 && (
                <TouchableOpacity
                  style={[
                    styles.modalSecondaryButton,
                    isMobile && styles.modalButtonMobile,
                  ]}
                  onPress={() => {
                    setChangeEmailStep(1);
                  }}
                  activeOpacity={0.85}
                  disabled={changeEmailLoading}
                >
                  <Text style={styles.modalSecondaryButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              {changeEmailStep === 1 ? (
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    isMobile && styles.modalButtonMobile,
                    (changeEmailLoading || changeEmailSendingCode) && styles.buttonDisabled,
                  ]}
                  activeOpacity={0.85}
                  onPress={verifyChangeEmailPin}
                  disabled={changeEmailLoading || changeEmailSendingCode}
                >
                  {changeEmailLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="arrow-forward-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.modalPrimaryButtonText}>Next</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    isMobile && styles.modalButtonMobile,
                    changeEmailLoading && styles.buttonDisabled,
                  ]}
                  activeOpacity={0.85}
                  onPress={submitNewEmail}
                  disabled={changeEmailLoading}
                >
                  {changeEmailLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.modalPrimaryButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── CHANGE PASSWORD MODAL ──────────────────────────────────────── */}
      <Modal
        visible={isChangePasswordModalVisible}
        animationType="fade"
        transparent
        onRequestClose={resetChangePasswordModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={resetChangePasswordModal}
          />

          <View
            style={[
              styles.modalCardSmall,
              { width: childModalWidth },
              isMobile && styles.modalCardMobile,
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalIconBox,
                    isMobile && styles.modalIconBoxMobile,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={22}
                    color="#DC2626"
                  />
                </View>

                <View style={styles.modalHeaderTextWrap}>
                  <Text style={[styles.modalTitle, isMobile && styles.modalTitleMobile]}>
                    Change Password
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Step {changePasswordStep} of 3
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={resetChangePasswordModal}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color="#7A4A4A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.modalContent,
                isMobile && styles.modalContentMobile,
              ]}
            >
              {changePasswordStep === 1 && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="mail-outline" size={18} color="#DC2626" />
                    <Text style={styles.modalSectionTitle}>Enter Email</Text>
                  </View>

                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="mail-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={passwordEmail}
                      onChangeText={setPasswordEmail}
                      placeholder="Enter your email address"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!changePasswordLoading}
                    />
                  </View>
                </View>
              )}

              {changePasswordStep === 2 && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="key-outline" size={18} color="#DC2626" />
                    <Text style={styles.modalSectionTitle}>Enter PIN Code</Text>
                  </View>

                  <Text style={styles.helperText}>
                    Enter the 4-digit PIN code sent to {passwordEmail || "your email"}.
                  </Text>

                  <PinInput
                    value={changePasswordPin}
                    onChange={handleChangePasswordPinChange}
                    isMobile={isMobile}
                    disabled={changePasswordLoading}
                  />

                  <TouchableOpacity
                    onPress={sendChangePasswordPin}
                    disabled={changePasswordLoading}
                    activeOpacity={0.85}
                    style={styles.resendLinkWrap}
                  >
                    <Text style={styles.resendLinkText}>
                      Didn't get a code? Resend
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {changePasswordStep === 3 && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color="#DC2626"
                    />
                    <Text style={styles.modalSectionTitle}>Set New Password</Text>
                  </View>

                  <Text style={styles.fieldLabel}>New Password</Text>
                  <View style={styles.inputField}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color="#8A6F6F"
                    />
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                      secureTextEntry={!showNewPassword}
                      editable={!changePasswordLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword((prev) => !prev)}
                      disabled={changePasswordLoading}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.passwordEyeButton}
                    >
                      <Ionicons
                        name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                        size={18}
                        color="#8A6F6F"
                      />
                    </TouchableOpacity>
                    {newPassword.length > 0 && (
                      <Ionicons
                        name={isNewPasswordValid ? "checkmark-circle" : "alert-circle-outline"}
                        size={18}
                        color={isNewPasswordValid ? "#15803D" : "#DC2626"}
                      />
                    )}
                  </View>

                  <View style={styles.passwordChecklist}>
                    {passwordChecks.map((check) => (
                      <View key={check.label} style={styles.passwordCheckRow}>
                        <Ionicons
                          name={check.passed ? "checkmark-circle" : "ellipse-outline"}
                          size={15}
                          color={check.passed ? "#15803D" : "#B79A9A"}
                        />
                        <Text
                          style={[
                            styles.passwordCheckText,
                            check.passed && styles.passwordCheckTextPassed,
                          ]}
                        >
                          {check.label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text style={[styles.fieldLabel, styles.fieldLabelTop]}>
                    Confirm Password
                  </Text>
                  <View style={styles.inputField}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color="#8A6F6F"
                    />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                      secureTextEntry={!showConfirmPassword}
                      editable={!changePasswordLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword((prev) => !prev)}
                      disabled={changePasswordLoading}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.passwordEyeButton}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                        size={18}
                        color="#8A6F6F"
                      />
                    </TouchableOpacity>
                    {confirmPassword.length > 0 && (
                      <Ionicons
                        name={passwordsMatch ? "checkmark-circle" : "close-circle"}
                        size={18}
                        color={passwordsMatch ? "#15803D" : "#DC2626"}
                      />
                    )}
                  </View>
                  {confirmPassword.length > 0 && (
                    <View style={[styles.passwordCheckRow, styles.passwordMatchRow]}>
                      <Ionicons
                        name={passwordsMatch ? "checkmark-circle" : "close-circle"}
                        size={15}
                        color={passwordsMatch ? "#15803D" : "#DC2626"}
                      />
                      <Text
                        style={[
                          styles.passwordCheckText,
                          passwordsMatch
                            ? styles.passwordCheckTextPassed
                            : styles.passwordCheckTextError,
                        ]}
                      >
                        {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, isMobile && styles.modalFooterMobile]}>
              {changePasswordStep > 1 && (
                <TouchableOpacity
                  style={[
                    styles.modalSecondaryButton,
                    isMobile && styles.modalButtonMobile,
                  ]}
                  onPress={() => {
                    setChangePasswordStep((prev) => Math.max(1, prev - 1));
                  }}
                  activeOpacity={0.85}
                  disabled={changePasswordLoading}
                >
                  <Text style={styles.modalSecondaryButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              {changePasswordStep < 3 ? (
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    isMobile && styles.modalButtonMobile,
                    changePasswordLoading && styles.buttonDisabled,
                  ]}
                  activeOpacity={0.85}
                  onPress={
                    changePasswordStep === 1
                      ? sendChangePasswordPin
                      : verifyChangePasswordPin
                  }
                  disabled={changePasswordLoading}
                >
                  {changePasswordLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="arrow-forward-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.modalPrimaryButtonText}>Next</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    isMobile && styles.modalButtonMobile,
                    changePasswordLoading && styles.buttonDisabled,
                  ]}
                  activeOpacity={0.85}
                  onPress={submitNewPassword}
                  disabled={changePasswordLoading}
                >
                  {changePasswordLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.modalPrimaryButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast — portal-based, matches Chatbot/Register/Community/Dashboard/
          ClassesScreen/SignIn so feedback looks and behaves the same
          everywhere. */}
      <Modal
        visible={toast.visible}
        transparent
        animationType="fade"
        onRequestClose={hideToast}
        statusBarTranslucent
      >
        <View style={styles.toastPortal} pointerEvents="box-none">
          <Toast
            visible={toast.visible}
            message={toast.message}
            type={toast.type}
            onHide={hideToast}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(43, 17, 17, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  modalCard: {
    maxWidth: 560,
    maxHeight: "92%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    overflow: "hidden",
  },

  modalCardSmall: {
    maxWidth: 480,
    maxHeight: "92%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    overflow: "hidden",
  },

  modalCardMobile: {
    maxWidth: "100%",
    borderRadius: 22,
  },

  modalHeader: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F8E3E3",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  modalHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    paddingRight: 16,
  },

  modalHeaderTextWrap: {
    flex: 1,
  },

  modalIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  modalIconBoxMobile: {
    width: 46,
    height: 46,
    borderRadius: 16,
    marginRight: 12,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 4,
  },

  modalTitleMobile: {
    fontSize: 20,
  },

  modalSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#8A6F6F",
  },

  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
  },

  modalContent: {
    padding: 24,
    paddingBottom: 12,
  },

  modalContentMobile: {
    padding: 18,
    paddingBottom: 10,
  },

  modalSection: {
    marginBottom: 22,
  },

  modalSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  modalSectionTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#2B1111",
  },

  helperText: {
    fontSize: 14,
    color: "#8A6F6F",
    lineHeight: 21,
    marginBottom: 16,
  },

  passwordChecklist: {
    marginTop: 10,
    marginBottom: 16,
  },

  passwordCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  passwordCheckText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#8A6F6F",
  },

  passwordCheckTextPassed: {
    color: "#15803D",
  },

  passwordCheckTextError: {
    color: "#DC2626",
  },

  passwordMatchRow: {
    marginTop: 10,
  },

  actionCard: {
    minHeight: 70,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },

  actionCardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },

  smallIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  actionCardTextWrap: {
    flex: 1,
  },

  actionCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 4,
  },

  actionCardSubtitle: {
    fontSize: 13,
    color: "#8A6F6F",
    lineHeight: 19,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5F3B3B",
    marginBottom: 10,
  },

  fieldLabelTop: {
    marginTop: 18,
  },

  inputField: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFF9F9",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  inputDisabled: {
    opacity: 0.5,
  },

  textInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#2B1111",
    fontWeight: "600",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },

  passwordEyeButton: {
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  // ─── PIN input: centered container pattern (matches SignIn.tsx) ────────
  // A width-capped, self-centered wrapper + flex boxes instead of fixed
  // widths — this is what actually keeps the PIN boxes centered instead of
  // hugging the left edge on web where ScrollView content can shrink-wrap.
  pinContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  pinRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    gap: 10,
  },

  pinRowMobile: {
    maxWidth: 280,
    gap: 10,
  },

  pinBox: {
    flex: 1,
    maxWidth: 58,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFF9F9",
    fontSize: 22,
    fontWeight: "800",
    color: "#2B1111",
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlign: "center",
    ...Platform.select({
      web: { lineHeight: 56, outlineStyle: "none", textAlign: "center" } as any,
      default: {},
    }),
  },

  pinBoxMobile: {
    maxWidth: 56,
    height: 56,
    fontSize: 20,
    borderRadius: 14,
    textAlign: "center",
    ...Platform.select({
      web: { lineHeight: 54, textAlign: "center" } as any,
      default: {},
    }),
  },

  resendLinkWrap: {
    marginTop: 14,
    alignItems: "center",
  },

  resendLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },

  // Toast — portal-based, matches Chatbot/Register/Community/Dashboard/
  // ClassesScreen/SignIn.
  toastPortal: {
    ...StyleSheet.absoluteFillObject,
  },

  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: "#F8E3E3",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },

  modalFooterMobile: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 10,
    flexWrap: "wrap",
  },

  modalFooterMobileSingle: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },

  modalSecondaryButton: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7C0C0",
    backgroundColor: "#FFF7F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    minWidth: 110,
  },

  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7A4A4A",
  },

  modalPrimaryButton: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    minWidth: 110,
  },

  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 8,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  modalButtonMobile: {
    flex: 1,
    minWidth: "47%",
    marginRight: 0,
  },

  fullWidthButton: {
    width: "100%",
    marginRight: 0,
  },
});