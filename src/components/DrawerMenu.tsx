import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { signOut } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { auth } from '../../firebaseConfig';

// 🔥 Shared apiFetch — attaches a fresh Firebase Bearer token automatically
// and retries once on 401. Every network call in this file now goes through
// this, instead of the old cookie-only fetch, because the backend's
// /auth/*, /upload-student-grade, etc. routes expect a verified Firebase
// ID token (req.user from the auth middleware), not a session cookie.
// Using a cookie-only fetch against those routes meant requests were either
// silently unauthenticated or rejected before ever reaching the Firestore/
// Storage validation + write logic — which is why "Upload Grade" appeared
// to do nothing.
import { apiFetch as sharedApiFetch } from '../services/api';
import {
  getCachedUserImageUrl,
  setCachedUserImageUrl,
} from '../services/userImageUrlCache';

// ✅ Same Toast component used by Admin Settings (and Chatbot/Register/
// Community/Dashboard/ClassesScreen/SignIn) — reused here so Student
// Settings' PIN/email/password feedback looks and behaves identically to
// Admin's, instead of native Alert dialogs. Adjust this path if your
// folder layout differs.
import Toast from '../Final_Admin_Components/Toast';

type ToastType = 'success' | 'error' | 'info';


type ScreenType =
  | 'home'
  | 'classes'
  | 'game'
  | 'flipit'
  | 'fruitmania'
  | 'quizmasters'
  | 'videos'
  | 'myjourney'
  | 'analytics'
  | 'profile'
  | 'messenger'
  | 'assignments'
  | 'coursedetail'
  | 'community'
  | 'generateactivity'
  | 'notification';

interface DrawerMenuProps {
  isFixed: boolean;
  onClose?: () => void;
  onNavigate?: (screen: ScreenType) => void;
  activeScreen?: ScreenType;
  userName?: string;
  userEmail?: string;
  userAvatar?: any;
  userAvatarStoragePath?: string | null; // 👈 enables cached signed-URL refresh
  userId: string;
  userRole: 'student' | 'teacher' | 'admin';
  apiBaseUrl: string;
  onAvatarPress?: () => void;
  onEmailUpdated?: (email: string) => void;
  onFilePickerOpen?: () => void;
  onVerificationFailed?: (errorMessage: string) => void;
  onUploadSuccess?: () => void; 
  // 👇 NEW: lets the parent drive a floating progress toast while a grade
  // file is uploading. `onUploadProgress` fires with 0-100 while the file
  // is actively being sent; `onUploadStageChange` fires when we move from
  // "uploading" to "verifying" (waiting on the backend's identity check +
  // grade parsing) and finally to `null` once the request settles either
  // way (success, failure, or error) so the toast can be dismissed.
  onUploadProgress?: (percent: number) => void;
  onUploadStageChange?: (stage: 'uploading' | 'verifying' | 'processing' | null) => void;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
}

const DEFAULT_AVATAR = require('../../assets/images/default_profile.png');

// Single source of truth for the minimum new-password length, used both by
// the inline hint under "New Password" and by handleChangePassword's
// validation below, so the two can't drift out of sync.
const MIN_PASSWORD_LENGTH = 8;

// ---- Student Settings: mirrors the Admin Settings PIN-based flow/style ----
// (see Settings.tsx). Kept local to DrawerMenu since Admin Settings is its
// own screen and must not be touched.

// Masks an email for display, e.g. "jadwiga@gmail.com" -> "jad******@gmail.com".
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
// character on top of the 8-character minimum.
function getPasswordPolicyError(password: string): string | null {
  const value = (password || '').trim();
  const REQUIREMENT_MESSAGE =
    'Password must be at least 8 characters, and include an uppercase letter, a lowercase letter, a number, and a special character.';

  if (
    value.length < MIN_PASSWORD_LENGTH ||
    !/[A-Z]/.test(value) ||
    !/[a-z]/.test(value) ||
    !/[0-9]/.test(value) ||
    !/[^A-Za-z0-9]/.test(value)
  ) {
    return REQUIREMENT_MESSAGE;
  }

  return null;
}

type PinInputProps = {
  value: string[];
  onChange: (index: number, text: string) => void;
  isMobile: boolean;
  disabled?: boolean;
};

// 4-digit PIN entry used by the Change Email / Change Password verification
// steps below — mirrors Settings.tsx's PinInput exactly (auto-advance on
// digit entry, backspace jumps back a box).
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

// ---- Cache-aware signed-URL refresh for the drawer avatar. ----
// Mirrors the teacher-side pattern: check the cache first, only hit the
// network when the cached signed URL is missing or expired.
const refreshUserImageUrl = async (
  entityId: string,
  storagePath?: string | null
): Promise<string | null> => {
  if (!storagePath) return null;

  const cached = getCachedUserImageUrl(entityId, storagePath);
  if (cached) return cached;

  try {
    const response = await sharedApiFetch('/storage/user-image-signed-url', {
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
  highlighted,
}: {
  ionIconName?: string;
  iconName?: string;
  label: string;
  onPress?: () => void;
  active?: boolean;
  highlighted?: boolean;
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isLargeScreen = width >= 1024;
  const menuItemVerticalMargin = isMobile ? 12 : isLargeScreen ? 14.5 : 16;
  const menuLabelFontSize = isMobile ? 15 : 17;

  return (
    <Pressable
      onPress={onPress}
      style={(state) => {
        const base: StyleProp<ViewStyle> = [
          styles.menuItem,
          { 
            marginVertical: menuItemVerticalMargin, 
            borderRadius: 14, 
          },
          highlighted && {
            backgroundColor: '#D32F2F',
          },
          active && !highlighted && {
            backgroundColor: 'rgba(211,47,47,0.08)',
          },
        ];

        if (Platform.OS === 'web' && (state as any).hovered) {
          if (highlighted) {
            base.push({ backgroundColor: '#B71C1C' });
          } else if (!active) {
            base.push({ backgroundColor: 'rgba(130,129,129,0.08)' });
          }
        }

        return base;
      }}
    >
      {ionIconName ? (
        <Ionicons
          name={ionIconName as any}
          size={22}
          color={highlighted ? '#FFF' : active ? '#D32F2F' : '#444'}
          style={styles.vectorMenuIcon}
        />
      ) : (
        <MaterialCommunityIcons
          name={iconName as any}
          size={22}
          color={highlighted ? '#FFF' : active ? '#D32F2F' : '#444'}
          style={styles.vectorMenuIcon}
        />
      )}

      <Text
        style={[
          styles.menuLabel,
          { fontSize: menuLabelFontSize },
          highlighted && { color: '#FFF', fontWeight: '700' },
          active && !highlighted && { color: '#D32F2F', fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

// 🔥 XHR-based POST that reports real upload progress (fetch has no upload
// progress event). Mirrors sharedApiFetch's behavior: attaches a fresh
// Firebase Bearer token, sends cookies, and retries once on 401 with a
// force-refreshed token.
const uploadJsonWithProgress = (
  apiBaseUrl: string,
  path: string,
  body: Record<string, any>,
  onProgress?: (percent: number) => void
): Promise<{ status: number; ok: boolean; data: any }> => {
  const send = (token: string | null) =>
    new Promise<{ status: number; ok: boolean; data: any }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${apiBaseUrl}${path}`);
      xhr.withCredentials = true;
      xhr.setRequestHeader('Content-Type', 'application/json');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        // Cap at 99% here — 100% is reserved for once the server actually
        // responds, so the bar doesn't sit "done" while we're still
        // waiting on identity verification / grade parsing.
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        onProgress?.(percent);
      };

      xhr.onload = () => {
        let data: any = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = null;
        }
        resolve({ status: xhr.status, ok: xhr.status >= 200 && xhr.status < 300, data });
      };

      xhr.onerror = () => reject(new Error('Network error while uploading grade file.'));
      xhr.ontimeout = () => reject(new Error('Upload timed out. Please try again.'));

      xhr.send(JSON.stringify(body));
    });

  return (async () => {
    const initialToken = await auth.currentUser?.getIdToken().catch(() => null);
    const first = await send(initialToken || null);
    if (first.status !== 401) return first;

    // Retry once with a force-refreshed token, same as sharedApiFetch.
    const refreshedToken = await auth.currentUser?.getIdToken(true).catch(() => null);
    if (!refreshedToken) return first;
    return send(refreshedToken);
  })();
};

const DrawerMenu = ({
  isFixed,
  onClose,
  onNavigate,
  activeScreen,
  userName = 'Student',
  userEmail = '',
  userAvatar,
  userAvatarStoragePath, // 👈
  userId,
  userRole,
  apiBaseUrl,
  onAvatarPress,
  onEmailUpdated,
  onFilePickerOpen,
  onVerificationFailed,
  onUploadSuccess, 
  onUploadProgress,
  onUploadStageChange,
  setIsLoggedIn,
}: DrawerMenuProps) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isChangeEmailModalVisible, setChangeEmailModalVisible] = useState(false);
  const [isChangePasswordModalVisible, setChangePasswordModalVisible] = useState(false);

  const [isUploadingGrade, setIsUploadingGrade] = useState(false);

  // ✅ Toast state — same shape/usage as Admin Settings, replacing Alert.alert
  // for the Change Email / Change Password flows below.
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

  // ─── Change Email state (mirrors Settings.tsx's Admin flow) ───────────
  const [changeEmailStep, setChangeEmailStep] = useState(1);
  const [changeEmailPin, setChangeEmailPin] = useState(['', '', '', '']);
  const [newEmail, setNewEmail] = useState('');
  const [changeEmailLoading, setChangeEmailLoading] = useState(false);
  const [changeEmailSendingCode, setChangeEmailSendingCode] = useState(false);
  const [changeEmailCodeSent, setChangeEmailCodeSent] = useState(false);

  // ─── Change Password state (mirrors Settings.tsx's Admin flow) ────────
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

  // 👇 State for the cached/refreshed avatar signed URL
  const [refreshedAvatarUrl, setRefreshedAvatarUrl] = useState<string | null>(null);

  // Live password strength checks — mirrors getPasswordPolicyError's rules,
  // broken out per-requirement so each one can show its own checkmark as
  // the student types instead of only surfacing a single pass/fail message
  // on submit.
  const passwordChecks = [
    { label: 'At least 8 characters', passed: newPassword.trim().length >= MIN_PASSWORD_LENGTH },
    { label: 'One uppercase letter', passed: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter', passed: /[a-z]/.test(newPassword) },
    { label: 'One number', passed: /[0-9]/.test(newPassword) },
    { label: 'One special character', passed: /[^A-Za-z0-9]/.test(newPassword) },
  ];
  const isNewPasswordValid = passwordChecks.every((check) => check.passed);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  useEffect(() => {
    setPasswordEmail(userEmail || '');
  }, [userEmail]);

  // Hide the browser's default focus ring and built-in password
  // reveal/autofill icons so our custom red focus border and eye icon are
  // the only visible affordances — mirrors the same effect in Register.tsx.
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

  // 👇 Fetch (and periodically refresh) the signed URL for the drawer avatar
  useEffect(() => {
    let isMounted = true;
    const fetchAvatar = async () => {
      const url = await refreshUserImageUrl(userId, userAvatarStoragePath);
      if (isMounted && url) {
        setRefreshedAvatarUrl(url);
      }
    };
    fetchAvatar();
    // Refresh every 5 minutes to keep the signed URL valid if the drawer stays open
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

  const handleContentSizeChange = (_contentW: number, contentH: number) => {
    setContentHeight(contentH);
  };

  const handleScrollViewLayout = (e: LayoutChangeEvent) => {
    setScrollViewHeight(e.nativeEvent.layout.height);
  };

  // ─── Change Email handlers (mirrors Settings.tsx's Admin flow) ────────
  // Same two-step "verify PIN sent to your existing email, then enter the
  // new email" flow used by Admin Settings — replaces the old
  // current-password re-authentication approach.
  const resetChangeEmailModal = () => {
    setChangeEmailStep(1);
    setChangeEmailPin(['', '', '', '']);
    setNewEmail('');
    setChangeEmailLoading(false);
    setChangeEmailSendingCode(false);
    setChangeEmailCodeSent(false);
    setChangeEmailModalVisible(false);
  };

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
      const response = await sharedApiFetch('/auth/send-forgot-password-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || 'Failed to send verification code.');

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
      const response = await sharedApiFetch('/auth/verify-forgot-password-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, pin }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || 'Invalid or expired code.');

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
      // 🔥 sharedApiFetch attaches a fresh Firebase Bearer token so the
      // backend's auth middleware can resolve req.user before touching
      // Firestore.
      const response = await sharedApiFetch('/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          role: userRole,
          newEmail: trimmedEmail,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to update email.');

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

  // ─── Change Password handlers (mirrors Settings.tsx's Admin flow) ─────
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
      const response = await sharedApiFetch('/auth/send-forgot-password-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || 'Failed to send verification code.');

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
      const response = await sharedApiFetch('/auth/verify-forgot-password-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: passwordEmail.trim(), pin }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || 'Invalid or expired code.');

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
      const response = await sharedApiFetch('/auth/reset-forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: passwordEmail.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || 'Failed to update password.');

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

  const handleLogout = async () => {
    try {
      await sharedApiFetch('/auth/session-logout', {
        method: 'POST',
      });
    } catch {}

    try {
      await signOut(auth);
    } catch {}

    setLogoutModalVisible(false);
    if (!isFixed) onClose?.();
    setIsLoggedIn(false);
  };

  const handleUploadGrade = async () => {
    try {
      onFilePickerOpen?.(); 
      
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (asset.size && asset.size > 10 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select a file smaller than 10MB.');
        return;
      }

      setIsUploadingGrade(true);
      onUploadStageChange?.('uploading');
      onUploadProgress?.(0);

      let base64Data = '';
      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result;
            if (typeof res !== 'string') { reject(new Error('Failed to read file.')); return; }
            resolve(res.includes(',') ? res.split(',')[1] : res);
          };
          reader.onerror = () => reject(new Error('Failed to convert blob to base64.'));
          reader.readAsDataURL(blob);
        });
      } else {
        base64Data = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      }

      if (!base64Data || base64Data.length < 100) {
        throw new Error('File content is empty or too small.');
      }

      // 🔥 FIX: this used to go through the plain cookie-only fetch, which
      // meant the backend's Firebase auth middleware never saw a verified
      // ID token for this request. Depending on how that middleware is
      // wired, the request either got silently treated as unauthenticated
      // (skipping the Firestore write + grade-file validation entirely) or
      // was rejected in a way this code didn't clearly surface. Now using
      // an XHR-based helper that attaches a fresh Bearer token (retried
      // once on 401, matching sharedApiFetch) while ALSO reporting real
      // upload progress, since plain fetch has no upload progress event.
      let processingTimer: ReturnType<typeof setTimeout> | null = null;

      const { status, ok, data } = await uploadJsonWithProgress(
        apiBaseUrl,
        '/upload-student-grade',
        {
          fileBase64: base64Data,
          fileName: asset.name,
          fileType: asset.mimeType || 'application/octet-stream',
          studentId: userId,
        },
        (percent) => {
          onUploadProgress?.(percent);
          // Once the bytes have actually finished sending, hand off to the
          // "checking identity" stage while we wait on the server's AI
          // verification + grade-parsing calls (there's no server-sent
          // progress for that part, so this is purely a stage indicator).
          if (percent >= 99) {
            onUploadStageChange?.('verifying');
            if (!processingTimer) {
              processingTimer = setTimeout(() => {
                onUploadStageChange?.('processing');
              }, 4000);
            }
          }
        }
      );

      if (processingTimer) clearTimeout(processingTimer);

      if (!ok) {
        // Handle Identity Mismatch
        if (status === 403) {
          onVerificationFailed?.(data?.error || 'Identity verification failed.');
          return;
        }

        // Handle AI Service Outage (Strict Mode)
        if (status === 503) {
          Alert.alert('Service Unavailable', data?.error || 'Please try uploading your grade again in a few minutes.');
          return;
        }

        // Handle Internal Server Errors (500) - Usually means AI Key issue or File Too Large
        if (status === 500) {
          Alert.alert('Upload Error', data?.error || 'The server encountered an error processing your file. Please try a smaller file or contact support.');
          return;
        }

        throw new Error(data?.error || 'Failed to upload grade file.');
      }

      onUploadProgress?.(100);
      onUploadSuccess?.();

    } catch (error: any) {
      console.error('Upload grade error:', error);
      Alert.alert('Upload Failed', error?.message || 'Unable to upload grade file.');
    } finally {
      setIsUploadingGrade(false);
      onUploadStageChange?.(null);
    }
  };

  // 👇 Prefer the freshly-refreshed signed URL; fall back to whatever was passed in
  const finalAvatarSource = refreshedAvatarUrl
    ? { uri: refreshedAvatarUrl }
    : normalizeImageSource(userAvatar);

  return (
    <View 
      style={[
        styles.drawerContainer, 
        { width: drawerWidth },
        isMobile && {
          paddingTop: insets.top + 25,
          paddingBottom: insets.bottom + 25,
          paddingLeft: insets.left + 25,
          paddingRight: insets.right + 25,
        }
      ]}
    > 
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
        <MenuItem ionIconName="clipboard" label="Assignments" onPress={() => { onNavigate?.('assignments'); if (!isFixed) onClose?.(); }} active={activeScreen === 'assignments'} />
        <MenuItem ionIconName="calendar" label="My Journey" onPress={() => { onNavigate?.('myjourney'); if (!isFixed) onClose?.(); }} active={activeScreen === 'myjourney'} />
        <MenuItem iconName="chart-line" label="Analytics" onPress={() => { onNavigate?.('analytics'); if (!isFixed) onClose?.(); }} active={activeScreen === 'analytics'} />
        <MenuItem ionIconName="people" label="Community" onPress={() => { onNavigate?.('community'); if (!isFixed) onClose?.(); }} active={activeScreen === 'community'} />
        <MenuItem ionIconName="settings" label="Settings" onPress={() => setSettingsModalVisible(true)} />
        
        <MenuItem 
          iconName="file-upload-outline" 
          label={isUploadingGrade ? "Uploading..." : "Upload Grade"} 
          onPress={handleUploadGrade} 
          highlighted
        />
      </ScrollView>

      <Pressable style={styles.logoutMenuItem} onPress={() => setLogoutModalVisible(true)}>
        <MaterialCommunityIcons name="logout" size={28} color="#D32F2F" style={{ marginRight: 20 }} />
        <Text style={styles.logoutLabel}>Logout</Text>
      </Pressable>

      {/* ─── SETTINGS (mirrors Admin Settings.tsx flow/style) ──────────── */}
      <Modal animationType="fade" transparent visible={isSettingsModalVisible} onRequestClose={() => setSettingsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isMobile && styles.modalCardMobile]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconBox, isMobile && styles.modalIconBoxMobile]}>
                  <Ionicons name="settings-outline" size={22} color="#D32F2F" />
                </View>
                <View style={styles.modalHeaderTextWrap}>
                  <Text style={[styles.modalTitle, isMobile && styles.modalTitleMobile]}>Settings</Text>
                  <Text style={styles.modalSubtitle}>Manage your account settings and security options.</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSettingsModalVisible(false)} activeOpacity={0.85}>
                <Ionicons name="close" size={20} color="#7A4A4A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.modalContent, isMobile && styles.modalContentMobile]}
            >
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeaderRow}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#D32F2F" />
                  <Text style={styles.modalSectionTitle}>Account & Security</Text>
                </View>

                <TouchableOpacity style={styles.actionCard} activeOpacity={0.85} onPress={openChangeEmailModal}>
                  <View style={styles.actionCardLeft}>
                    <View style={styles.smallIconBox}>
                      <Ionicons name="mail-outline" size={18} color="#D32F2F" />
                    </View>
                    <View style={styles.actionCardTextWrap}>
                      <Text style={styles.actionCardTitle}>Change Email</Text>
                      <Text style={styles.actionCardSubtitle}>Verify PIN first, then update your email address.</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard} activeOpacity={0.85} onPress={openChangePasswordModal}>
                  <View style={styles.actionCardLeft}>
                    <View style={styles.smallIconBox}>
                      <Ionicons name="lock-closed-outline" size={18} color="#D32F2F" />
                    </View>
                    <View style={styles.actionCardTextWrap}>
                      <Text style={styles.actionCardTitle}>Change Password</Text>
                      <Text style={styles.actionCardSubtitle}>Verify PIN, then set a new password.</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, isMobile && styles.modalFooterMobileSingle]}>
              <TouchableOpacity
                style={[styles.modalSecondaryButton, isMobile && styles.fullWidthButton]}
                onPress={() => setSettingsModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSecondaryButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── CHANGE EMAIL MODAL (PIN verification, then new email) ─────── */}
      <Modal animationType="fade" transparent visible={isChangeEmailModalVisible} onRequestClose={resetChangeEmailModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCardSmall, isMobile && styles.modalCardMobile]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconBox, isMobile && styles.modalIconBoxMobile]}>
                  <Ionicons name="mail-outline" size={22} color="#D32F2F" />
                </View>
                <View style={styles.modalHeaderTextWrap}>
                  <Text style={[styles.modalTitle, isMobile && styles.modalTitleMobile]}>Change Email</Text>
                  <Text style={styles.modalSubtitle}>Step {changeEmailStep} of 2</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={resetChangeEmailModal} activeOpacity={0.85}>
                <Ionicons name="close" size={20} color="#7A4A4A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.modalContent, isMobile && styles.modalContentMobile]}
            >
              {changeEmailStep === 1 && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="key-outline" size={18} color="#D32F2F" />
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

                  <TouchableOpacity
                    onPress={sendChangeEmailPin}
                    disabled={changeEmailSendingCode}
                    activeOpacity={0.85}
                    style={styles.resendLinkWrap}
                  >
                    <Text style={styles.resendLinkText}>
                      {changeEmailSendingCode
                        ? 'Sending code...'
                        : changeEmailCodeSent
                        ? "Didn't get a code? Resend"
                        : 'Send verification code'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {changeEmailStep === 2 && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="mail-open-outline" size={18} color="#D32F2F" />
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
                  style={[styles.modalSecondaryButton, isMobile && styles.modalButtonMobile]}
                  onPress={() => setChangeEmailStep(1)}
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
                      <Ionicons name="arrow-forward-outline" size={18} color="#FFFFFF" />
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
                      <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.modalPrimaryButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── CHANGE PASSWORD MODAL (PIN verification, then new password) ── */}
      <Modal animationType="fade" transparent visible={isChangePasswordModalVisible} onRequestClose={resetChangePasswordModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCardSmall, isMobile && styles.modalCardMobile]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconBox, isMobile && styles.modalIconBoxMobile]}>
                  <Ionicons name="lock-closed-outline" size={22} color="#D32F2F" />
                </View>
                <View style={styles.modalHeaderTextWrap}>
                  <Text style={[styles.modalTitle, isMobile && styles.modalTitleMobile]}>Change Password</Text>
                  <Text style={styles.modalSubtitle}>Step {changePasswordStep} of 2</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={resetChangePasswordModal} activeOpacity={0.85}>
                <Ionicons name="close" size={20} color="#7A4A4A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.modalContent, isMobile && styles.modalContentMobile]}
            >
              {changePasswordStep === 1 && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="key-outline" size={18} color="#D32F2F" />
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

                  <TouchableOpacity
                    onPress={sendChangePasswordPin}
                    disabled={changePasswordSendingCode}
                    activeOpacity={0.85}
                    style={styles.resendLinkWrap}
                  >
                    <Text style={styles.resendLinkText}>
                      {changePasswordSendingCode
                        ? 'Sending code...'
                        : changePasswordCodeSent
                        ? "Didn't get a code? Resend"
                        : 'Send verification code'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {changePasswordStep === 2 && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="lock-closed-outline" size={18} color="#D32F2F" />
                    <Text style={styles.modalSectionTitle}>Set New Password</Text>
                  </View>

                  <Text style={styles.fieldLabel}>New Password</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="lock-closed-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                      secureTextEntry={!showNewPassword}
                      editable={!changePasswordLoading}
                    />
                    <Pressable
                      onPress={() => setShowNewPassword((prev) => !prev)}
                      disabled={changePasswordLoading}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.passwordEyeButton}
                    >
                      <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#8A6F6F" />
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
                        <Text style={[styles.passwordCheckText, check.passed && styles.passwordCheckTextPassed]}>
                          {check.label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text style={[styles.fieldLabel, styles.fieldLabelTop]}>Confirm Password</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="lock-closed-outline" size={18} color="#8A6F6F" />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor="#B79A9A"
                      style={styles.textInput}
                      secureTextEntry={!showConfirmPassword}
                      editable={!changePasswordLoading}
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword((prev) => !prev)}
                      disabled={changePasswordLoading}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.passwordEyeButton}
                    >
                      <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#8A6F6F" />
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
                      <Text style={[styles.passwordCheckText, passwordsMatch ? styles.passwordCheckTextPassed : styles.passwordCheckTextError]}>
                        {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, isMobile && styles.modalFooterMobile]}>
              {changePasswordStep > 1 && (
                <TouchableOpacity
                  style={[styles.modalSecondaryButton, isMobile && styles.modalButtonMobile]}
                  onPress={() => setChangePasswordStep((prev) => Math.max(1, prev - 1))}
                  activeOpacity={0.85}
                  disabled={changePasswordLoading}
                >
                  <Text style={styles.modalSecondaryButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              {changePasswordStep < 2 ? (
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    isMobile && styles.modalButtonMobile,
                    (changePasswordLoading || changePasswordSendingCode) && styles.buttonDisabled,
                  ]}
                  activeOpacity={0.85}
                  onPress={verifyChangePasswordPin}
                  disabled={changePasswordLoading || changePasswordSendingCode}
                >
                  {changePasswordLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="arrow-forward-outline" size={18} color="#FFFFFF" />
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
                      <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.modalPrimaryButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

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

      {/* Toast — same portal-based component used by Admin Settings (and
          Chatbot/Register/Community/Dashboard/ClassesScreen/SignIn), so
          Student Settings feedback looks and behaves identically. */}
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

export default DrawerMenu;

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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  logoutModalContainer: { backgroundColor: '#FFF', borderRadius: 18, padding: 20, width: '88%', maxWidth: 360 },
  logoutModalTitle: { fontSize: 20, fontWeight: '700', color: '#222', textAlign: 'center' },
  logoutModalSubtitle: { fontSize: 14, color: '#777', textAlign: 'center', marginTop: 8 },
  logoutButtonsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  modalCancelBtn: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 10, borderRadius: 10, backgroundColor: '#F3F4F6' },
  modalCancelText: { color: '#444', fontWeight: '600' },
  logoutConfirmBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#D32F2F' },
  logoutConfirmText: { color: '#FFF', fontWeight: '700' },

  // ─── Settings (mirrors Admin Settings.tsx's card modal styling) ───────
  modalCard: {
    maxWidth: 560,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#F3D4D4',
    overflow: 'hidden',
    width: '92%',
  },
  modalCardSmall: {
    maxWidth: 480,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#F3D4D4',
    overflow: 'hidden',
    width: '92%',
  },
  modalCardMobile: {
    width: '100%',
    maxWidth: '100%',
    borderRadius: 22,
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F8E3E3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalHeaderLeft: { flex: 1, flexDirection: 'row', paddingRight: 16 },
  modalHeaderTextWrap: { flex: 1 },
  modalIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  modalIconBoxMobile: { width: 46, height: 46, borderRadius: 16, marginRight: 12 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#2B1111', marginBottom: 4 },
  modalTitleMobile: { fontSize: 20 },
  modalSubtitle: { fontSize: 14, lineHeight: 21, color: '#8A6F6F' },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: { padding: 24, paddingBottom: 12 },
  modalContentMobile: { padding: 18, paddingBottom: 10 },
  modalSection: { marginBottom: 22 },
  modalSectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  modalSectionTitle: { marginLeft: 8, fontSize: 16, fontWeight: '800', color: '#2B1111' },
  helperText: { fontSize: 14, color: '#8A6F6F', lineHeight: 21, marginBottom: 16 },
  passwordChecklist: { marginTop: 10, marginBottom: 16 },
  passwordCheckRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  passwordCheckText: { marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#8A6F6F' },
  passwordCheckTextPassed: { color: '#15803D' },
  passwordCheckTextError: { color: '#DC2626' },
  passwordMatchRow: { marginTop: 10 },
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
  actionCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 10 },
  smallIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionCardTextWrap: { flex: 1 },
  actionCardTitle: { fontSize: 15, fontWeight: '800', color: '#2B1111', marginBottom: 4 },
  actionCardSubtitle: { fontSize: 13, color: '#8A6F6F', lineHeight: 19 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#5F3B3B', marginBottom: 10 },
  fieldLabelTop: { marginTop: 18 },
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
  inputDisabled: { opacity: 0.5 },
  textInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#2B1111',
    fontWeight: '600',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  passwordEyeButton: { paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
  // PIN input: centered container pattern (matches Settings.tsx / SignIn.tsx)
  pinContainer: { width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  pinRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: 320, gap: 10 },
  pinRowMobile: { maxWidth: 280, gap: 10 },
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
  resendLinkWrap: { marginTop: 14, alignItems: 'center' },
  resendLinkText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  // Toast — portal-based, matches Admin Settings/Chatbot/Register/Community/
  // Dashboard/ClassesScreen/SignIn.
  toastPortal: { ...StyleSheet.absoluteFillObject },
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
  modalFooterMobile: { paddingHorizontal: 18, paddingBottom: 18, gap: 10, flexWrap: 'wrap' },
  modalFooterMobileSingle: { paddingHorizontal: 18, paddingBottom: 18 },
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
  modalSecondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#7A4A4A' },
  modalPrimaryButton: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 110,
  },
  modalPrimaryButtonText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginLeft: 8 },
  buttonDisabled: { opacity: 0.6 },
  modalButtonMobile: { flex: 1, minWidth: '47%', marginRight: 0 },
  fullWidthButton: { width: '100%', marginRight: 0 },
});