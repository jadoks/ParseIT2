import { signOut } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { auth } from '../../firebaseConfig';
// 🔥 Import shared API and Cache utilities
import { apiFetch } from '../services/api';
import {
  getCachedUserImageUrl,
  setCachedUserImageUrl,
} from '../services/userImageUrlCache';

// ✅ Reuses the same Toast component used across the app (Admin Settings,
// Chatbot/Register/Community/Dashboard/ClassesScreen/SignIn) instead of
// Alert, so feedback looks and behaves consistently across roles.
import Toast from '../Final_Admin_Components/Toast'; // adjust path if your folder layout differs

type ToastType = 'success' | 'error' | 'info';

export type DrawerScreenType =
  | 'home'
  | 'honors'
  | 'grades'
  | 'announcement'
  | 'profile'
  | 'messenger'
  | 'coursedetail'
  | 'community'
  | 'notification'
  | 'analytics';

interface DrawerMenuProps {
  isFixed: boolean;
  onClose?: () => void;
  onNavigate?: (screen: DrawerScreenType | string) => void;
  activeScreen?: DrawerScreenType | string;
  userName?: string;
  userEmail?: string;
  userAvatar?: any;
  userAvatarStoragePath?: string | null; // 👈 ADDED: To fetch signed URL
  userId: string;
  userRole: 'student' | 'teacher' | 'admin';
  apiBaseUrl: string;
  onAvatarPress?: () => void;
  onEmailUpdated?: (email: string) => void;
  setIsLoggedIn: (val: boolean) => void;
}

const DEFAULT_AVATAR = require('../../assets/images/pogi.jpg');

// Masks an email for display, e.g. "jadwiga@gmail.com" -> "jad******@gmail.com".
// Keeps the first 3 characters of the local part visible, replaces the rest
// with a fixed run of asterisks, and leaves the domain untouched. Mirrors
// the same helper used in the Admin Settings flow.
function maskEmail(email: string): string {
  const trimmed = (email || '').trim();
  const atIndex = trimmed.indexOf('@');

  if (atIndex <= 0) {
    return trimmed;
  }

  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex);
  const visible = localPart.slice(0, 3);

  return `${visible}${'*'.repeat(6)}${domainPart}`;
}

// Keep in sync with getPasswordPolicyError in server.js — length alone lets
// weak passwords like "password" or "12345678" through. Requires at least
// one uppercase letter, one lowercase letter, one number, and one special
// character on top of the 8-character minimum. Mirrors the Admin Settings
// flow's password policy. Returns an error message if the password is too
// weak, or null if it passes.
function getPasswordPolicyError(password: string): string | null {
  const value = (password || '').trim();
  const REQUIREMENT_MESSAGE =
    'Password must be at least 8 characters, and include an uppercase letter, a lowercase letter, a number, and a special character.';

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

// 👇 Helper to refresh signed URL for the drawer avatar
const refreshUserImageUrl = async (
  entityId: string,
  storagePath?: string | null
): Promise<string | null> => {
  if (!storagePath) return null;
  const cached = getCachedUserImageUrl(entityId, storagePath);
  if (cached) return cached;
  try {
    const response = await apiFetch('/storage/user-image-signed-url', {
      method: 'POST',
      body: JSON.stringify({ storagePath }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Unable to refresh user image.');
    }
    if (data?.url) {
      setCachedUserImageUrl(entityId, storagePath, data.url);
      return data.url;
    }
    return null;
  } catch {
    return null;
  }
};

const normalizeImageSource = (img: any) => {
  if (!img) return DEFAULT_AVATAR;
  if (typeof img === 'number') return img;
  if (img?.uri) return { uri: img.uri };
  return DEFAULT_AVATAR;
};

const MenuItem = ({
  ionIconName,
  iconName,
  label,
  onPress,
  active,
}: {
  ionIconName?: string;
  iconName?: string;
  label: string;
  onPress?: () => void;
  active?: boolean;
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isLargeScreen = width >= 1024;
  const menuItemVerticalMargin = isMobile ? 12 : isLargeScreen ? 18 : 16;
  const menuLabelFontSize = isMobile ? 15 : 17;

  return (
    <Pressable
      onPress={onPress}
      style={(state) => {
        const base: StyleProp<ViewStyle> = [
          styles.menuItem,
          { marginVertical: menuItemVerticalMargin },
          active && {
            backgroundColor: 'rgba(211,47,47,0.08)',
            borderRadius: 14,
          },
        ];
        if (Platform.OS === 'web' && (state as any).hovered && !active) {
          base.push({
            backgroundColor: 'rgba(130,129,129,0.08)',
            borderRadius: 14,
          });
        }
        return base;
      }}
    >
      {ionIconName ? (
        <Ionicons
          name={ionIconName as any}
          size={22}
          color={active ? '#D32F2F' : '#444'}
          style={styles.vectorMenuIcon}
        />
      ) : (
        <MaterialCommunityIcons
          name={iconName as any}
          size={22}
          color={active ? '#D32F2F' : '#444'}
          style={styles.vectorMenuIcon}
        />
      )}
      <Text
        style={[
          styles.menuLabel,
          { fontSize: menuLabelFontSize },
          active && { color: '#D32F2F', fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

// ─── PIN Input — mirrors the Admin Settings flow's 4-digit code entry ─────
type PinInputProps = {
  value: string[];
  onChange: (index: number, text: string) => void;
  isMobile: boolean;
  disabled?: boolean;
};

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
              const cleanText = text.replace(/[^0-9]/g, '').slice(-1);
              onChange(index, cleanText);

              if (cleanText && index < 3) {
                refs.current[index + 1]?.focus();
              }
            }}
            onKeyPress={({ nativeEvent }) => {
              if (
                nativeEvent.key === 'Backspace' &&
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

const TeacherDrawerMenu = ({
  isFixed,
  onClose,
  onNavigate,
  activeScreen,
  userName = 'Teacher',
  userEmail = '',
  userAvatar,
  userAvatarStoragePath, // 👈 ADDED
  userId,
  userRole,
  apiBaseUrl,
  onAvatarPress,
  onEmailUpdated,
  setIsLoggedIn,
}: DrawerMenuProps) => {
  const { width } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isChangeEmailModalVisible, setChangeEmailModalVisible] = useState(false);
  const [isChangePasswordModalVisible, setChangePasswordModalVisible] = useState(false);

  // 👇 State for refreshed avatar URL
  const [refreshedAvatarUrl, setRefreshedAvatarUrl] = useState<string | null>(null);

  // ✅ Toast state — same shape/usage as the Admin Settings flow, replacing
  // Alert.alert everywhere in this file.
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
  }>({ visible: false, message: '', type: 'success' });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  // ─── Change Email state (PIN-verify flow, mirrors Admin) ───────────────
  const [changeEmailStep, setChangeEmailStep] = useState(1);
  const [changeEmailPin, setChangeEmailPin] = useState(['', '', '', '']);
  const [newEmail, setNewEmail] = useState('');
  const [changeEmailLoading, setChangeEmailLoading] = useState(false);
  const [changeEmailSendingCode, setChangeEmailSendingCode] = useState(false);
  const [changeEmailCodeSent, setChangeEmailCodeSent] = useState(false);

  // ─── Change Password state (PIN-verify flow, mirrors Admin) ────────────
  const [changePasswordStep, setChangePasswordStep] = useState(1);
  const [passwordEmail, setPasswordEmail] = useState(userEmail || '');
  const [changePasswordPin, setChangePasswordPin] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordSendingCode, setChangePasswordSendingCode] = useState(false);
  const [changePasswordCodeSent, setChangePasswordCodeSent] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setPasswordEmail(userEmail || '');
  }, [userEmail]);

  // 🧹 Web-only: hide the browser's native password reveal/autofill icons
  // and default focus outline so our custom eye icons and red focus borders
  // (Change Password modal fields) are the only ones the user sees. This is
  // the same injection used in Register.tsx, kept in sync here.
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.innerHTML = `
        /* Hide Edge/IE's built-in "reveal password" eye icon */
        input::-ms-reveal, input::-ms-clear { display: none !important; }

        /* Hide Chrome's autofill "key" icon inside password fields */
        input::-webkit-credentials-auto-fill-button {
          display: none !important;
          visibility: hidden;
          pointer-events: none;
          position: absolute;
          right: 0;
        }

        /* Hide Safari's "strong password" suggestion icon */
        input::-webkit-strong-password-auto-fill-button {
          display: none !important;
          visibility: hidden;
        }

        /* Disable default browser focus outline (black ring) to allow custom red border */
        input:focus, textarea:focus, select:focus {
          outline: none !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // 👇 Fetch signed URL for drawer avatar
  useEffect(() => {
    let isMounted = true;
    const fetchAvatar = async () => {
      const url = await refreshUserImageUrl(userId, userAvatarStoragePath);
      if (isMounted && url) {
        setRefreshedAvatarUrl(url);
      }
    };
    fetchAvatar();
    // Refresh every 5 minutes to keep URL valid if drawer stays open
    const interval = setInterval(fetchAvatar, 5 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userId, userAvatarStoragePath]);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isSmallMobile = width < 380;
  const hasOverflow = contentHeight > scrollViewHeight && scrollViewHeight > 0;
  const shouldShowScrollBar = (isMobile || isTablet) && hasOverflow;
  const drawerWidth = isMobile ? (isSmallMobile ? '85%' : 280) : isTablet ? 300 : 260;

  // Settings dialog sizing — mirrors the Admin Settings flow's breakpoints.
  const settingsCardWidth = isMobile ? '100%' : isTablet ? '74%' : '42%';
  const childModalWidth = isMobile ? '100%' : isTablet ? '68%' : '36%';

  const handleContentSizeChange = (_contentW: number, contentH: number) => {
    setContentHeight(contentH);
  };

  const handleScrollViewLayout = (e: LayoutChangeEvent) => {
    setScrollViewHeight(e.nativeEvent.layout.height);
  };

  // Raw fetch helper (mirrors the local `apiFetch` used in the Admin
  // Settings flow) — kept distinct from the imported `apiFetch` above,
  // which targets a different base URL convention.
  const apiFetchRaw = (url: string, options: any = {}) =>
    fetch(url, {
      credentials: 'include',
      ...options,
    });

  // ─── Change Email handlers (PIN-verify, mirrors Admin) ──────────────────
  const resetChangeEmailModal = () => {
    setChangeEmailStep(1);
    setChangeEmailPin(['', '', '', '']);
    setNewEmail('');
    setChangeEmailLoading(false);
    setChangeEmailSendingCode(false);
    setChangeEmailCodeSent(false);
    setChangeEmailModalVisible(false);
  };

  const handleChangeEmailPinChange = (index: number, text: string) => {
    const updated = [...changeEmailPin];
    updated[index] = text;
    setChangeEmailPin(updated);
  };

  const openChangeEmailModal = () => {
    setSettingsModalVisible(false);
    setChangeEmailModalVisible(true);
    void sendChangeEmailPin();
  };

  const sendChangeEmailPin = async () => {
    if (!userEmail) {
      showToast('Your account has no email on file. Contact support.', 'error');
      return;
    }

    setChangeEmailSendingCode(true);

    try {
      const res = await apiFetchRaw(`${apiBaseUrl}/auth/send-forgot-password-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send verification code.');
      }

      setChangeEmailCodeSent(true);
    } catch (error: any) {
      showToast(error?.message || 'Failed to send verification code.', 'error');
    } finally {
      setChangeEmailSendingCode(false);
    }
  };

  const verifyChangeEmailPin = async () => {
    const pin = changeEmailPin.join('');

    if (pin.length !== 4) {
      showToast('Please enter the 4-digit code.', 'error');
      return;
    }

    setChangeEmailLoading(true);

    try {
      const res = await apiFetchRaw(`${apiBaseUrl}/auth/verify-forgot-password-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Invalid or expired code.');
      }

      setChangeEmailStep(2);
    } catch (error: any) {
      showToast(error?.message || 'Invalid or expired code.', 'error');
    } finally {
      setChangeEmailLoading(false);
    }
  };

  const submitNewEmail = async () => {
    const trimmedEmail = newEmail.trim();

    if (!trimmedEmail) {
      showToast('Please enter your new email address.', 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    setChangeEmailLoading(true);

    try {
      const res = await apiFetchRaw(`${apiBaseUrl}/auth/change-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          role: userRole,
          newEmail: trimmedEmail,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update email.');
      }

      showToast('Email updated successfully.', 'success');
      onEmailUpdated?.(data?.data?.email || trimmedEmail);

      setTimeout(() => {
        resetChangeEmailModal();
      }, 1200);
    } catch (error: any) {
      showToast(error?.message || 'Failed to update email.', 'error');
    } finally {
      setChangeEmailLoading(false);
    }
  };

  // ─── Change Password handlers (PIN-verify, mirrors Admin) ───────────────
  const resetChangePasswordModal = () => {
    setChangePasswordStep(1);
    setPasswordEmail(userEmail || '');
    setChangePasswordPin(['', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
    setChangePasswordLoading(false);
    setChangePasswordSendingCode(false);
    setChangePasswordCodeSent(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setChangePasswordModalVisible(false);
  };

  const handleChangePasswordPinChange = (index: number, text: string) => {
    const updated = [...changePasswordPin];
    updated[index] = text;
    setChangePasswordPin(updated);
  };

  const openChangePasswordModal = () => {
    setSettingsModalVisible(false);
    setChangePasswordModalVisible(true);
    void sendChangePasswordPin();
  };

  const sendChangePasswordPin = async () => {
    if (!userEmail) {
      showToast('Your account has no email on file. Contact support.', 'error');
      return;
    }

    setChangePasswordSendingCode(true);

    try {
      const res = await apiFetchRaw(`${apiBaseUrl}/auth/send-forgot-password-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send verification code.');
      }

      setChangePasswordCodeSent(true);
    } catch (error: any) {
      showToast(error?.message || 'Failed to send verification code.', 'error');
    } finally {
      setChangePasswordSendingCode(false);
    }
  };

  const verifyChangePasswordPin = async () => {
    const pin = changePasswordPin.join('');

    if (pin.length !== 4) {
      showToast('Please enter the 4-digit code.', 'error');
      return;
    }

    setChangePasswordLoading(true);

    try {
      const res = await apiFetchRaw(`${apiBaseUrl}/auth/verify-forgot-password-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: passwordEmail.trim(), pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Invalid or expired code.');
      }

      setChangePasswordStep(2);
    } catch (error: any) {
      showToast(error?.message || 'Invalid or expired code.', 'error');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const submitNewPassword = async () => {
    const passwordPolicyError = getPasswordPolicyError(newPassword);
    if (passwordPolicyError) {
      showToast(passwordPolicyError, 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setChangePasswordLoading(true);

    try {
      const res = await apiFetchRaw(`${apiBaseUrl}/auth/reset-forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: passwordEmail.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update password.');
      }

      showToast('Password updated successfully.', 'success');

      setTimeout(() => {
        resetChangePasswordModal();
      }, 1200);
    } catch (error: any) {
      showToast(error?.message || 'Failed to update password.', 'error');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  // Live password strength checks — mirrors getPasswordPolicyError's rules,
  // broken out per-requirement so each one can show its own checkmark as
  // the teacher types, same as the Admin Settings flow.
  const passwordChecks = [
    { label: 'At least 8 characters', passed: newPassword.trim().length >= 8 },
    { label: 'One uppercase letter', passed: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter', passed: /[a-z]/.test(newPassword) },
    { label: 'One number', passed: /[0-9]/.test(newPassword) },
    { label: 'One special character', passed: /[^A-Za-z0-9]/.test(newPassword) },
  ];
  const isNewPasswordValid = passwordChecks.every((check) => check.passed);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleLogout = async () => {
    try {
      await fetch(`${apiBaseUrl}/auth/session-logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    try {
      await signOut(auth);
    } catch {}
    setLogoutModalVisible(false);
    if (!isFixed) onClose?.();
    setIsLoggedIn(false);
  };

  // 👇 Determine final avatar source
  const finalAvatarSource = refreshedAvatarUrl
    ? { uri: refreshedAvatarUrl }
    : normalizeImageSource(userAvatar);

  return (
    <View style={[styles.drawerContainer, { width: drawerWidth }]}>
      <Pressable style={styles.profileSection} onPress={onAvatarPress}>
        <Image source={finalAvatarSource} style={styles.avatar} resizeMode="cover" />
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{userName}</Text>
          {!!userEmail && <Text style={styles.userEmail}>{userEmail}</Text>}
        </View>
      </Pressable>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={shouldShowScrollBar}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleScrollViewLayout}
      >
        <MenuItem ionIconName="person" label="Profile" onPress={() => { onNavigate?.('profile'); if (!isFixed) onClose?.(); }} active={activeScreen === 'profile'} />
        <MenuItem ionIconName="people" label="Community" onPress={() => { onNavigate?.('community'); if (!isFixed) onClose?.(); }} active={activeScreen === 'community'} />
        <MenuItem iconName="chart-line" label="Academic Analytics" onPress={() => { onNavigate?.('analytics'); if (!isFixed) onClose?.(); }} active={activeScreen === 'analytics'} />
        <MenuItem ionIconName="settings" label="Settings" onPress={() => setSettingsModalVisible(true)} />
      </ScrollView>
      <Pressable style={styles.logoutMenuItem} onPress={() => setLogoutModalVisible(true)}>
        <MaterialCommunityIcons name="logout" size={28} color="#D32F2F" style={{ marginRight: 20 }} />
        <Text style={styles.logoutLabel}>Logout</Text>
      </Pressable>

      {/* ─── SETTINGS MODAL — mirrors the Admin Settings flow's layout ────── */}
      <Modal
        visible={isSettingsModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.settingsModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSettingsModalVisible(false)}
          />

          <View
            style={[
              styles.modalCard,
              { width: settingsCardWidth },
              isMobile && styles.modalCardMobile,
            ]}
          >
            <View style={styles.settingsModalHeader}>
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
                  <Text style={[styles.settingsModalTitle, isMobile && styles.modalTitleMobile]}>
                    Settings
                  </Text>
                  <Text style={styles.settingsModalSubtitle}>
                    Manage your account settings and security options.
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setSettingsModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#7A4A4A" />
              </Pressable>
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

                <Pressable style={styles.actionCard} onPress={openChangeEmailModal}>
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
                </Pressable>

                <Pressable style={styles.actionCard} onPress={openChangePasswordModal}>
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
                        Verify PIN, then set a new password.
                      </Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
                </Pressable>
              </View>
            </ScrollView>

            <View
              style={[
                styles.modalFooter,
                isMobile && styles.modalFooterMobileSingle,
              ]}
            >
              <Pressable
                style={[
                  styles.modalSecondaryButton,
                  isMobile && styles.fullWidthButton,
                ]}
                onPress={() => setSettingsModalVisible(false)}
              >
                <Text style={styles.modalSecondaryButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── CHANGE EMAIL MODAL — mirrors the Admin Settings flow ─────────── */}
      <Modal
        visible={isChangeEmailModalVisible}
        animationType="fade"
        transparent
        onRequestClose={resetChangeEmailModal}
      >
        <View style={styles.settingsModalOverlay}>
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
            <View style={styles.settingsModalHeader}>
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
                  <Text style={[styles.settingsModalTitle, isMobile && styles.modalTitleMobile]}>
                    Change Email
                  </Text>
                  <Text style={styles.settingsModalSubtitle}>
                    Step {changeEmailStep} of 2
                  </Text>
                </View>
              </View>

              <Pressable style={styles.modalCloseButton} onPress={resetChangeEmailModal}>
                <Ionicons name="close" size={20} color="#7A4A4A" />
              </Pressable>
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
                      ? `Sending a 4-digit code to ${maskEmail(userEmail || '') || 'your email'}...`
                      : `Enter the 4-digit PIN code sent to ${maskEmail(userEmail || '') || 'your existing email'}.`}
                  </Text>

                  <PinInput
                    value={changeEmailPin}
                    onChange={handleChangeEmailPinChange}
                    isMobile={isMobile}
                    disabled={changeEmailSendingCode || changeEmailLoading}
                  />

                  <Pressable
                    onPress={sendChangeEmailPin}
                    disabled={changeEmailSendingCode}
                    style={styles.resendLinkWrap}
                  >
                    <Text style={styles.resendLinkText}>
                      {changeEmailSendingCode
                        ? 'Sending code...'
                        : changeEmailCodeSent
                        ? "Didn't get a code? Resend"
                        : 'Send verification code'}
                    </Text>
                  </Pressable>
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
                      style={styles.settingsTextInput}
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
                <Pressable
                  style={[
                    styles.modalSecondaryButton,
                    isMobile && styles.modalButtonMobile,
                  ]}
                  onPress={() => setChangeEmailStep(1)}
                  disabled={changeEmailLoading}
                >
                  <Text style={styles.modalSecondaryButtonText}>Back</Text>
                </Pressable>
              )}

              {changeEmailStep === 1 ? (
                <Pressable
                  style={[
                    styles.modalPrimaryButton,
                    isMobile && styles.modalButtonMobile,
                    (changeEmailLoading || changeEmailSendingCode) && styles.buttonDisabled,
                  ]}
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
                </Pressable>
              ) : (
                <Pressable
                  style={[
                    styles.modalPrimaryButton,
                    isMobile && styles.modalButtonMobile,
                    changeEmailLoading && styles.buttonDisabled,
                  ]}
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
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── CHANGE PASSWORD MODAL — mirrors the Admin Settings flow ──────── */}
      <Modal
        visible={isChangePasswordModalVisible}
        animationType="fade"
        transparent
        onRequestClose={resetChangePasswordModal}
      >
        <View style={styles.settingsModalOverlay}>
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
            <View style={styles.settingsModalHeader}>
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
                  <Text style={[styles.settingsModalTitle, isMobile && styles.modalTitleMobile]}>
                    Change Password
                  </Text>
                  <Text style={styles.settingsModalSubtitle}>
                    Step {changePasswordStep} of 2
                  </Text>
                </View>
              </View>

              <Pressable style={styles.modalCloseButton} onPress={resetChangePasswordModal}>
                <Ionicons name="close" size={20} color="#7A4A4A" />
              </Pressable>
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
                    <Ionicons name="key-outline" size={18} color="#DC2626" />
                    <Text style={styles.modalSectionTitle}>Enter PIN Code</Text>
                  </View>

                  <Text style={styles.helperText}>
                    {changePasswordSendingCode
                      ? `Sending a 4-digit code to ${maskEmail(userEmail || '') || 'your email'}...`
                      : `Enter the 4-digit PIN code sent to ${maskEmail(userEmail || '') || 'your existing email'}.`}
                  </Text>

                  <PinInput
                    value={changePasswordPin}
                    onChange={handleChangePasswordPinChange}
                    isMobile={isMobile}
                    disabled={changePasswordSendingCode || changePasswordLoading}
                  />

                  <Pressable
                    onPress={sendChangePasswordPin}
                    disabled={changePasswordSendingCode}
                    style={styles.resendLinkWrap}
                  >
                    <Text style={styles.resendLinkText}>
                      {changePasswordSendingCode
                        ? 'Sending code...'
                        : changePasswordCodeSent
                        ? "Didn't get a code? Resend"
                        : 'Send verification code'}
                    </Text>
                  </Pressable>
                </View>
              )}

              {changePasswordStep === 2 && (
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
                      style={styles.settingsTextInput}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      editable={!changePasswordLoading}
                    />
                    <Pressable
                      onPress={() => setShowNewPassword((prev) => !prev)}
                      disabled={changePasswordLoading}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.passwordEyeButton}
                    >
                      <Ionicons
                        name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#8A6F6F"
                      />
                    </Pressable>
                    {newPassword.length > 0 && (
                      <Ionicons
                        name={isNewPasswordValid ? 'checkmark-circle' : 'alert-circle-outline'}
                        size={18}
                        color={isNewPasswordValid ? '#15803D' : '#DC2626'}
                      />
                    )}
                  </View>

                  <View style={styles.passwordChecklist}>
                    {passwordChecks.map((check) => (
                      <View key={check.label} style={styles.passwordCheckRow}>
                        <Ionicons
                          name={check.passed ? 'checkmark-circle' : 'ellipse-outline'}
                          size={15}
                          color={check.passed ? '#15803D' : '#B79A9A'}
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
                      style={styles.settingsTextInput}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      editable={!changePasswordLoading}
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword((prev) => !prev)}
                      disabled={changePasswordLoading}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.passwordEyeButton}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#8A6F6F"
                      />
                    </Pressable>
                    {confirmPassword.length > 0 && (
                      <Ionicons
                        name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                        size={18}
                        color={passwordsMatch ? '#15803D' : '#DC2626'}
                      />
                    )}
                  </View>
                  {confirmPassword.length > 0 && (
                    <View style={[styles.passwordCheckRow, styles.passwordMatchRow]}>
                      <Ionicons
                        name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                        size={15}
                        color={passwordsMatch ? '#15803D' : '#DC2626'}
                      />
                      <Text
                        style={[
                          styles.passwordCheckText,
                          passwordsMatch
                            ? styles.passwordCheckTextPassed
                            : styles.passwordCheckTextError,
                        ]}
                      >
                        {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, isMobile && styles.modalFooterMobile]}>
              {changePasswordStep > 1 && (
                <Pressable
                  style={[
                    styles.modalSecondaryButton,
                    isMobile && styles.modalButtonMobile,
                  ]}
                  onPress={() => setChangePasswordStep((prev) => Math.max(1, prev - 1))}
                  disabled={changePasswordLoading}
                >
                  <Text style={styles.modalSecondaryButtonText}>Back</Text>
                </Pressable>
              )}

              {changePasswordStep < 2 ? (
                <Pressable
                  style={[
                    styles.modalPrimaryButton,
                    isMobile && styles.modalButtonMobile,
                    (changePasswordLoading || changePasswordSendingCode) &&
                      styles.buttonDisabled,
                  ]}
                  onPress={verifyChangePasswordPin}
                  disabled={changePasswordLoading || changePasswordSendingCode}
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
                </Pressable>
              ) : (
                <Pressable
                  style={[
                    styles.modalPrimaryButton,
                    isMobile && styles.modalButtonMobile,
                    changePasswordLoading && styles.buttonDisabled,
                  ]}
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
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── LOGOUT MODAL (unchanged) ──────────────────────────────────────── */}
      <Modal animationType="fade" transparent visible={isLogoutModalVisible} onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.logoutModalContainer}>
            <Text style={styles.logoutModalTitle}>Are you sure you want to logout?</Text>
            <Text style={styles.logoutModalSubtitle}>You will need to sign in again to continue using your account.</Text>
            <View style={styles.logoutButtonsRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setLogoutModalVisible(false)}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
              <Pressable style={styles.logoutConfirmBtn} onPress={handleLogout}><Text style={styles.logoutConfirmText}>Logout</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast — same portal-based component used by the Admin Settings flow
          (and Chatbot/Register/Community/Dashboard/ClassesScreen/SignIn), so
          feedback looks and behaves the same across roles. Replaces Alert. */}
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
    </View>
  );
};

export default TeacherDrawerMenu;

const styles = StyleSheet.create({
  drawerContainer: { height: '100%', padding: 25, backgroundColor: '#FFF', borderColor: 'transparent' },
  profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, overflow: 'hidden', aspectRatio: 1 },
  userName: { fontWeight: '700', fontSize: 18 },
  userEmail: { marginTop: 2, fontSize: 12, color: '#777' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10 },
  menuIcon: { width: 22, height: 22, marginRight: 20, resizeMode: 'contain' },
  vectorMenuIcon: { width: 22, marginRight: 20, textAlign: 'center' },
  menuLabel: { color: '#444', fontWeight: '500' },
  logoutMenuItem: { flexDirection: 'row', alignItems: 'center', marginTop: 20, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15 },
  logoutLabel: { fontSize: 16, color: '#D32F2F', fontWeight: '600' },

  // Generic overlay, kept for the Logout modal (unchanged from before).
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  logoutModalContainer: { backgroundColor: '#FFF', borderRadius: 18, padding: 20, width: '88%', maxWidth: 360 },
  logoutModalTitle: { fontSize: 20, fontWeight: '700', color: '#222', textAlign: 'center' },
  logoutModalSubtitle: { fontSize: 14, color: '#777', textAlign: 'center', marginTop: 8 },
  logoutButtonsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  modalCancelBtn: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 10, borderRadius: 10, backgroundColor: '#F3F4F6' },
  modalCancelText: { color: '#444', fontWeight: '600' },
  logoutConfirmBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#D32F2F' },
  logoutConfirmText: { color: '#FFF', fontWeight: '700' },

  // ─── Settings / Change Email / Change Password — mirrors the Admin
  // Settings flow's layout and color palette exactly. ─────────────────────
  settingsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43, 17, 17, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  modalCard: {
    maxWidth: 560,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#F3D4D4',
    overflow: 'hidden',
  },

  modalCardSmall: {
    maxWidth: 480,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#F3D4D4',
    overflow: 'hidden',
  },

  modalCardMobile: {
    maxWidth: '100%',
    borderRadius: 22,
  },

  settingsModalHeader: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F8E3E3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  modalHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    paddingRight: 16,
  },

  modalHeaderTextWrap: {
    flex: 1,
  },

  modalIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  modalIconBoxMobile: {
    width: 46,
    height: 46,
    borderRadius: 16,
    marginRight: 12,
  },

  settingsModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2B1111',
    marginBottom: 4,
  },

  modalTitleMobile: {
    fontSize: 20,
  },

  settingsModalSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#8A6F6F',
  },

  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  modalSectionTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#2B1111',
  },

  helperText: {
    fontSize: 14,
    color: '#8A6F6F',
    lineHeight: 21,
    marginBottom: 16,
  },

  passwordChecklist: {
    marginTop: 10,
    marginBottom: 16,
  },

  passwordCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  passwordCheckText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#8A6F6F',
  },

  passwordCheckTextPassed: {
    color: '#15803D',
  },

  passwordCheckTextError: {
    color: '#DC2626',
  },

  passwordMatchRow: {
    marginTop: 10,
  },

  actionCard: {
    minHeight: 70,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3D4D4',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },

  actionCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },

  smallIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  actionCardTextWrap: {
    flex: 1,
  },

  actionCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2B1111',
    marginBottom: 4,
  },

  actionCardSubtitle: {
    fontSize: 13,
    color: '#8A6F6F',
    lineHeight: 19,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5F3B3B',
    marginBottom: 10,
  },

  fieldLabelTop: {
    marginTop: 18,
  },

  inputField: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1CACA',
    backgroundColor: '#FFF9F9',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  inputDisabled: {
    opacity: 0.5,
  },

  settingsTextInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#2B1111',
    fontWeight: '600',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },

  passwordEyeButton: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── PIN input: centered container pattern (matches Admin Settings /
  // SignIn.tsx) — a width-capped, self-centered wrapper + flex boxes
  // instead of fixed widths, keeping the PIN boxes centered instead of
  // hugging the left edge on web where ScrollView content can shrink-wrap.
  pinContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  pinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
    borderColor: '#F1CACA',
    backgroundColor: '#FFF9F9',
    fontSize: 22,
    fontWeight: '800',
    color: '#2B1111',
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlign: 'center',
    ...Platform.select({
      web: { lineHeight: 56, outlineStyle: 'none', textAlign: 'center' } as any,
      default: {},
    }),
  },

  pinBoxMobile: {
    maxWidth: 56,
    height: 56,
    fontSize: 20,
    borderRadius: 14,
    textAlign: 'center',
    ...Platform.select({
      web: { lineHeight: 54, textAlign: 'center' } as any,
      default: {},
    }),
  },

  resendLinkWrap: {
    marginTop: 14,
    alignItems: 'center',
  },

  resendLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },

  // Toast — portal-based, matches the Admin Settings flow.
  toastPortal: {
    ...StyleSheet.absoluteFillObject,
  },

  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: '#F8E3E3',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  modalFooterMobile: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 10,
    flexWrap: 'wrap',
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
    borderColor: '#E7C0C0',
    backgroundColor: '#FFF7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    minWidth: 110,
  },

  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7A4A4A',
  },

  modalPrimaryButton: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 110,
  },

  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 8,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  modalButtonMobile: {
    flex: 1,
    minWidth: '47%',
    marginRight: 0,
  },

  fullWidthButton: {
    width: '100%',
    marginRight: 0,
  },
});