import Constants from 'expo-constants';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { auth } from '../../firebaseConfig';

// ✅ Reuses the same Toast component used across the app (Admin/Teacher
// screens, Community, Dashboard, ClassesScreen) instead of the bespoke
// "feedback" modal that used to live here, so login/reset feedback looks
// and behaves consistently everywhere.
import Toast from '../Final_Admin_Components/Toast'; // adjust path if your folder layout differs

type UserRole = 'student' | 'teacher' | 'admin';
type ForgotStep = 1 | 2 | 3;
type FirstLoginStep = 1 | 2;
type ToastType = 'success' | 'error' | 'info';

interface SignedInUser {
  role: UserRole;
  id: string;
  email: string | null;
  authUid?: string | null;
  studentId?: string;
  teacherId?: string;
  adminId?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: any;
  bannerImage?: any;
}

interface SignInProps {
  onLogIn?: (user: SignedInUser) => void;
  onGoToLanding?: () => void;
  onGoToRegister?: () => void;
}

type LookupUserResponse = {
  success: boolean;
  role: UserRole;
  id: string;
  email: string | null;
  mustChangePassword: boolean;
  codeVerified?: boolean;
  accountCreated?: boolean;
};

type SendForgotPasswordPinResponse = {
  success: boolean;
  role: UserRole;
  id: string;
  email: string;
  message: string;
};

type UserProfileResponse = {
  success: boolean;
  data: SignedInUser;
};

function getApiBaseUrl() {
  if (Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_API_URL!;
  }

  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';

  const host = possibleHost.split(':')[0];

  if (host) {
    return `http://${host}:5000`;
  }

  return 'http://192.168.1.5:5000';
}

const API_BASE_URL = getApiBaseUrl();

// ─── Screen transition timing (kept in sync with Register.tsx) ──────────────
const SCREEN_TRANSITION_DURATION = 280;
const SCREEN_SLIDE_DISTANCE = 24;

const SignIn = ({ onLogIn, onGoToLanding, onGoToRegister }: SignInProps) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Focus tracking so these fields get the same highlighted-border behavior
  // used across the app's other input components (Chatbot.tsx, etc.).
  const [isIdFocused, setIsIdFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>(1);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [forgotPasswordVerifiedEmail, setForgotPasswordVerifiedEmail] = useState('');
  const [isRecoveryEmailFocused, setIsRecoveryEmailFocused] = useState(false);

  const [firstLoginVisible, setFirstLoginVisible] = useState(false);
  const [firstLoginStep, setFirstLoginStep] = useState<FirstLoginStep>(1);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [pendingUserId, setPendingUserId] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  const [verificationPin, setVerificationPin] = useState(['', '', '', '']);
  const otpRefs = useRef<Array<TextInput | null>>([]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  // Shared by both the "forgot password" step 3 and "first login" step 2
  // password fields, since only one of those modals is ever visible at once.
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);
  const [isConfirmNewPasswordFocused, setIsConfirmNewPasswordFocused] = useState(false);

  // ✅ Toast state — same shape/usage as Community, Dashboard, ClassesScreen.
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
  }>({ visible: false, message: '', type: 'success' });

  // Some of the old feedback calls advanced the flow only after the user
  // acknowledged the message (see the password-reset success case below).
  // Toast auto-dismisses, so we run that follow-up when it hides instead.
  const [toastOnHide, setToastOnHide] = useState<(() => void) | null>(null);

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const isSmallScreen = width < 480;
  const isTablet = width >= 768;

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
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }
}, []);

  // ── Screen enter/exit animation ─────────────────────────────────────────
  // Sign In is treated as the "start" screen: it enters by fading/sliding in
  // from the left, and when the user navigates forward to Register it exits
  // by fading/sliding out to the left (so Register can slide in from the
  // right, giving the two screens a consistent left↔right relationship).
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateX = useRef(new Animated.Value(-SCREEN_SLIDE_DISTANCE)).current;

  useEffect(() => {
    screenOpacity.setValue(0);
    screenTranslateX.setValue(-SCREEN_SLIDE_DISTANCE);

    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: SCREEN_TRANSITION_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(screenTranslateX, {
        toValue: 0,
        duration: SCREEN_TRANSITION_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateAway = (direction: 'toRegister' | 'toLanding', action?: () => void) => {
    const exitTo =
      direction === 'toRegister' ? -SCREEN_SLIDE_DISTANCE : SCREEN_SLIDE_DISTANCE;

    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: SCREEN_TRANSITION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(screenTranslateX, {
        toValue: exitTo,
        duration: SCREEN_TRANSITION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        action?.();
      }
    });
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const otpValue = verificationPin.join('');
  const isPinValid = useMemo(() => /^\d{4}$/.test(otpValue), [otpValue]);

  const showToast = (
    message: string,
    type: ToastType = 'success',
    onHide?: () => void
  ) => {
    setToast({ visible: true, message, type });
    setToastOnHide(() => onHide || null);
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
    const callback = toastOnHide;
    setToastOnHide(null);
    if (callback) callback();
  };

  // Thin wrapper so every existing call site below can keep passing a
  // title alongside the message — the toast just folds them into one line.
  const showFeedback = (
    type: ToastType,
    title: string,
    message: string,
    onClose?: () => void
  ) => {
    showToast(`${title}: ${message}`, type, onClose);
  };

  const resetSharedPasswordState = () => {
    setVerificationPin(['', '', '', '']);
    setNewPassword('');
    setConfirmNewPassword('');
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  };

  const resetForgotPasswordState = () => {
    setForgotVisible(false);
    setForgotStep(1);
    setRecoveryEmail('');
    setForgotPasswordVerifiedEmail('');
    resetSharedPasswordState();
  };

  const resetFirstLoginState = () => {
    setFirstLoginVisible(false);
    setFirstLoginStep(1);
    setPendingRole(null);
    setPendingUserId('');
    setPendingEmail('');
    resetSharedPasswordState();
  };

  const handleGoToLanding = () => {
    if (typeof onGoToLanding === 'function') {
      navigateAway('toLanding', onGoToLanding);
    }
  };

  const handleGoToRegister = () => {
    if (typeof onGoToRegister === 'function') {
      navigateAway('toRegister', onGoToRegister);
    }
  };

  const handleForgotPassword = () => {
    resetForgotPasswordState();
    setForgotVisible(true);
  };

  const handleOtpChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '');

    if (!cleaned) {
      const updated = [...verificationPin];
      updated[index] = '';
      setVerificationPin(updated);
      return;
    }

    const updated = [...verificationPin];
    updated[index] = cleaned[cleaned.length - 1];
    setVerificationPin(updated);

    if (index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (
    e: { nativeEvent: { key: string } },
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !verificationPin[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const lookupUserById = async (
    userId: string
  ): Promise<LookupUserResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/lookup-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: userId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Unable to find user.');
    }

    return data;
  };

  const createBackendSession = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('Firebase user session is missing.');
    }

    const idToken = await currentUser.getIdToken(true);

    const response = await fetch(`${API_BASE_URL}/auth/session-login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        deviceId: Platform.OS,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to create secure backend session.');
    }

    return data;
  };

  const fetchSignedInUserProfile = async (
    userId: string,
    role: UserRole
  ): Promise<SignedInUser> => {
    const response = await fetch(`${API_BASE_URL}/auth/user-profile`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: userId,
        role,
      }),
    });

    const data: UserProfileResponse = await response.json();

    if (!response.ok) {
      throw new Error((data as any)?.error || 'Unable to load user profile.');
    }

    if (!data?.data) {
      throw new Error('User profile response is missing data.');
    }

    return data.data;
  };

  const completeLogin = async (userId: string, role: UserRole) => {
    await createBackendSession();
    const signedInUser = await fetchSignedInUserProfile(userId, role);
    onLogIn?.(signedInUser);
  };

  const sendFirstLoginPin = async (userId: string, role: UserRole) => {
    const response = await fetch(`${API_BASE_URL}/auth/send-first-login-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: userId,
        role,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to send first login PIN.');
    }

    return data;
  };

  const sendForgotPasswordPin = async (
    email: string
  ): Promise<SendForgotPasswordPinResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/send-forgot-password-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to send forgot password PIN.');
    }

    return data;
  };

  const verifyForgotPasswordPin = async (email: string, pin: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-forgot-password-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Invalid PIN.');
    }

    return data;
  };

  const resetForgotPasswordRequest = async (email: string, passwordValue: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        newPassword: passwordValue,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to reset password.');
    }

    return data;
  };

  const firebasePasswordSignIn = async (email: string, rawPassword: string) => {
    try {
      return await signInWithEmailAndPassword(auth, email, rawPassword);
    } catch (error: any) {
      const code = error?.code || '';

      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-email'
      ) {
        throw new Error('Invalid ID or password.');
      }

      throw new Error(error?.message || 'Unable to sign in.');
    }
  };

  // ✅ UPDATED: Removed success modal, directly proceeds to dashboard
  const handleLogIn = async () => {
    if (!id.trim() || !password.trim()) {
      showFeedback('error', 'Missing Fields', 'Please enter your ID and password.');
      return;
    }

    const enteredId = id.trim();
    const enteredPassword = password.trim();

    try {
      setIsLoading(true);

      const user = await lookupUserById(enteredId);

      if (!user.email) {
        throw new Error('This account has no email assigned.');
      }

      await firebasePasswordSignIn(user.email, enteredPassword);

      if (user.mustChangePassword) {
        await sendFirstLoginPin(user.id, user.role);

        setPendingRole(user.role);
        setPendingUserId(user.id);
        setPendingEmail(user.email);
        setFirstLoginStep(1);
        resetSharedPasswordState();
        setFirstLoginVisible(true);

        showFeedback(
          'success',
          'Verification Code Sent',
          `A fresh 4-digit verification code was sent to ${user.email}.`
        );
        return;
      }

      // ✅ DIRECTLY PROCEED TO DASHBOARD (No success modal)
      await completeLogin(user.id, user.role);

    } catch (error: any) {
      try {
        await signOut(auth);
      } catch {}

      showFeedback('error', 'Login Failed', error?.message || 'Invalid ID or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailVerification = async () => {
    if (!recoveryEmail.trim()) {
      showFeedback('error', 'Email Required', 'Please enter your email address.');
      return;
    }

    if (!isValidEmail(recoveryEmail)) {
      showFeedback('error', 'Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      setIsLoading(true);

      const data = await sendForgotPasswordPin(recoveryEmail.trim());

      setForgotPasswordVerifiedEmail(data.email);
      setVerificationPin(['', '', '', '']);
      setForgotStep(2);

      showFeedback(
        'success',
        'Verification Sent',
        `A 4-digit verification code has been sent to ${data.email}.`
      );
    } catch (error: any) {
      showFeedback(
        'error',
        'Request Failed',
        error?.message || 'Unable to send verification code.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinVerification = async () => {
    if (!otpValue) {
      showFeedback('error', 'PIN Required', 'Please enter the 4-digit verification code.');
      return;
    }

    if (!isPinValid) {
      showFeedback('error', 'Invalid PIN', 'The PIN must be exactly 4 digits.');
      return;
    }

    if (!forgotPasswordVerifiedEmail) {
      showFeedback('error', 'Missing Email', 'Please restart the forgot password flow.');
      return;
    }

    try {
      setIsLoading(true);

      await verifyForgotPasswordPin(forgotPasswordVerifiedEmail, otpValue);
      setForgotStep(3);
    } catch (error: any) {
      showFeedback('error', 'PIN Verification Failed', error?.message || 'Invalid PIN.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!forgotPasswordVerifiedEmail) {
      showFeedback('error', 'Missing Email', 'Please restart the forgot password flow.');
      return;
    }

    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      showFeedback('error', 'Missing Fields', 'Please fill in both password fields.');
      return;
    }

    if (newPassword.length < 8) {
      showFeedback(
        'error',
        'Weak Password',
        'Your new password must be at least 8 characters long.'
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showFeedback(
        'error',
        'Password Mismatch',
        'New password and confirmation password do not match.'
      );
      return;
    }

    try {
      setIsLoading(true);

      await resetForgotPasswordRequest(forgotPasswordVerifiedEmail, newPassword.trim());

      showFeedback('success', 'Success', 'Your password has been reset successfully.', () => {
        resetForgotPasswordState();
      });
    } catch (error: any) {
      showFeedback('error', 'Reset Failed', error?.message || 'Unable to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirstLoginPinVerification = async () => {
    if (!pendingUserId || !pendingRole) {
      showFeedback('error', 'Missing User', 'Unable to verify this account right now.');
      return;
    }

    if (!otpValue) {
      showFeedback('error', 'PIN Required', 'Please enter your 4-digit PIN.');
      return;
    }

    if (!isPinValid) {
      showFeedback('error', 'Invalid PIN', 'The PIN must be exactly 4 digits.');
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/verify-first-login-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pendingUserId,
          role: pendingRole,
          pin: otpValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Invalid PIN.');
      }

      setFirstLoginStep(2);
    } catch (error: any) {
      showFeedback('error', 'PIN Verification Failed', error?.message || 'Invalid PIN.');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ UPDATED: Removed success modal, directly proceeds to dashboard
  const handleFirstLoginPasswordSetup = async () => {
    if (!pendingUserId || !pendingRole || !pendingEmail) {
      showFeedback('error', 'Missing User', 'Unable to complete setup right now.');
      return;
    }

    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      showFeedback('error', 'Missing Fields', 'Please fill in both password fields.');
      return;
    }

    if (newPassword.length < 8) {
      showFeedback(
        'error',
        'Weak Password',
        'Your new password must be at least 8 characters long.'
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showFeedback(
        'error',
        'Password Mismatch',
        'New password and confirmation password do not match.'
      );
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/complete-first-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pendingUserId,
          role: pendingRole,
          newPassword: newPassword.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Unable to complete first login.');
      }

      try {
        await signOut(auth);
      } catch {}

      await firebasePasswordSignIn(pendingEmail, newPassword.trim());

      const role = pendingRole;
      const userId = pendingUserId;

      resetFirstLoginState();

      // ✅ DIRECTLY PROCEED TO DASHBOARD (No success modal)
      await completeLogin(userId, role);

    } catch (error: any) {
      showFeedback(
        'error',
        'Setup Failed',
        error?.message || 'Unable to complete your first-time setup.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderForgotStepIndicator = () => {
    const steps = [
      { key: 1, label: 'Email' },
      { key: 2, label: 'PIN' },
      { key: 3, label: 'Reset' },
    ];

    return (
      <View style={styles.stepperContainer}>
        {steps.map((step, index) => {
          const isActive = forgotStep === step.key;
          const isCompleted = forgotStep > step.key;

          return (
            <React.Fragment key={step.key}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isActive && styles.stepCircleActive,
                    isCompleted && styles.stepCircleCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <Icon name="checkmark" size={16} color="#FFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        (isActive || isCompleted) && styles.stepNumberActive,
                      ]}
                    >
                      {step.key}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    (isActive || isCompleted) && styles.stepLabelActive,
                  ]}
                >
                  {step.label}
                </Text>
              </View>

              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    forgotStep > step.key && styles.stepLineActive,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  const renderFirstLoginStepIndicator = () => {
    const steps = [
      { key: 1, label: 'PIN' },
      { key: 2, label: 'Password' },
    ];

    return (
      <View style={styles.stepperContainer}>
        {steps.map((step, index) => {
          const isActive = firstLoginStep === step.key;
          const isCompleted = firstLoginStep > step.key;

          return (
            <React.Fragment key={step.key}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isActive && styles.stepCircleActive,
                    isCompleted && styles.stepCircleCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <Icon name="checkmark" size={16} color="#FFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        (isActive || isCompleted) && styles.stepNumberActive,
                      ]}
                    >
                      {step.key}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    (isActive || isCompleted) && styles.stepLabelActive,
                  ]}
                >
                  {step.label}
                </Text>
              </View>

              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    firstLoginStep > step.key && styles.stepLineActive,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  // ── Shared sign-in fields (rendered inside either layout) ────────────────
  const FormFields = (
    <>
      <View style={styles.formGroup}>
        <Text style={styles.fieldLabel}>ID Number</Text>
        <View style={[styles.inputWrapper, isIdFocused && styles.inputWrapperFocused]}>
          <TextInput
            style={styles.inputWithIcon}
            placeholder="Enter your numeric ID"
            placeholderTextColor="#9E9E9E"
            value={id}
            onChangeText={(text) => {
              const numericOnly = text.replace(/[^0-9]/g, '');
              setId(numericOnly);
            }}
            keyboardType="number-pad"
            editable={!isLoading}
            onFocus={() => setIsIdFocused(true)}
            onBlur={() => setIsIdFocused(false)}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.fieldLabel}>Password</Text>
        <View style={[styles.passwordContainer, isPasswordFocused && styles.passwordContainerFocused]}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            placeholderTextColor="#9E9E9E"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!isLoading}
            returnKeyType="go"
            onSubmitEditing={handleLogIn}
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => setIsPasswordFocused(false)}
          />

          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.iconButton}
            disabled={isLoading}
          >
            <Icon
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#7A7A7A"
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading}>
        <Text style={[styles.forgotPassword, isLargeScreen && styles.forgotPasswordLeft]}>
          Forgot Password?
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.logInButton, isLoading && styles.disabledButton]}
        onPress={handleLogIn}
        activeOpacity={0.9}
        disabled={isLoading}
      >
        <Text style={styles.logInText}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.registerButton}
        onPress={handleGoToRegister}
        disabled={isLoading}
      >
        <Text style={styles.registerButtonText}>
          Don't have an account? Sign Up
        </Text>
      </TouchableOpacity>
    </>
  );

  return (
    <Animated.View
      style={[
        styles.rootContainer,
        {
          opacity: screenOpacity,
          transform: [{ translateX: screenTranslateX }],
        },
      ]}
    >
      {isLargeScreen ? (
        // ── LARGE SCREEN: two-column split layout (matches Register) ─────
        <View style={styles.splitContainer}>
          {/* LEFT: image + text panel */}
          <View style={styles.leftPanel}>
            <ImageBackground
              source={require('../../assets/images/cote.jpeg')}
              style={styles.leftPanelBg}
              resizeMode="cover"
            >
              <View style={styles.leftPanelOverlay} />

              <TouchableOpacity
                style={styles.leftBackButton}
                onPress={handleGoToLanding}
                activeOpacity={0.85}
              >
                <Icon name="chevron-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.leftPanelContent}>
                <View style={styles.leftLogoWrap}>
                  <Image
                    source={require('../../assets/images/logo.png')}
                    style={styles.leftLogoImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.leftQuote}>
                  "Learning today, leading tomorrow."
                </Text>
                <Text style={styles.leftQuoteAuthor}>— ParseIT Hub</Text>
              </View>
            </ImageBackground>
          </View>

          {/* RIGHT: form panel */}
          <View style={styles.rightPanel}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <ScrollView
                contentContainerStyle={styles.rightScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.formWrapperLarge}>
                  <Text style={styles.headingSplit}>Sign in to your account</Text>
                  <Text style={styles.subheadingSplit}>
                    Enter your credentials to continue.
                  </Text>

                  {FormFields}
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      ) : (
        // ── SMALL SCREEN: full-screen layout (no background image / floating card) ───
        <View style={styles.fullScreenContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.screen}
          >
            <ScrollView
              contentContainerStyle={styles.fullScreenScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.fullScreenWrapper}>
                <TouchableOpacity
                  style={styles.brandBlock}
                  onPress={handleGoToLanding}
                  activeOpacity={0.9}
                >
                  <View style={styles.logoFloatingContainer}>
                    <Image
                      source={require('../../assets/images/logo.png')}
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
                  </View>
                </TouchableOpacity>

                <Text style={styles.heading}>Sign in to your account</Text>
                <Text style={styles.subheading}>
                  Enter your credentials to continue.
                </Text>

                {FormFields}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Forgot password modal */}
      <Modal
        visible={forgotVisible}
        transparent
        animationType="fade"
        onRequestClose={resetForgotPasswordState}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrapper}
          >
            <View style={styles.modalCard}>
              <TouchableOpacity
                onPress={resetForgotPasswordState}
                style={styles.modalCloseButton}
              >
                <Icon name="close-outline" size={24} color="#444" />
              </TouchableOpacity>

              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>Reset Password</Text>
                  <Text style={styles.modalSubtitle}>
                    Complete the steps below to recover your account
                  </Text>
                </View>
              </View>

              {renderForgotStepIndicator()}

              {forgotStep === 1 && (
                <View style={styles.stepContent}>
                  <View style={styles.modalIconWrapper}>
                    <Icon name="mail-open-outline" size={28} color="#D32F2F" />
                  </View>

                  <Text style={styles.stepTitle}>Verify your email</Text>
                  <Text style={styles.stepDescription}>
                    Enter your registered email address to receive a 4-digit verification code.
                  </Text>

                  <View style={[styles.modalInputWrapper, isRecoveryEmailFocused && styles.modalInputWrapperFocused]}>
                    <Icon name="mail-outline" size={18} color="#888" style={styles.inputIcon} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Enter email address"
                      placeholderTextColor="#9E9E9E"
                      value={recoveryEmail}
                      onChangeText={setRecoveryEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isLoading}
                       returnKeyType="go"
                      onSubmitEditing={handleEmailVerification}
                      onFocus={() => setIsRecoveryEmailFocused(true)}
                      onBlur={() => setIsRecoveryEmailFocused(false)}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, isLoading && styles.disabledButton]}
                    onPress={handleEmailVerification}
                    activeOpacity={0.85}
                    disabled={isLoading}
                  >
                    <Text style={styles.primaryButtonText}>
                      {isLoading ? 'Sending...' : 'Verify Email'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {forgotStep === 2 && (
                <View style={styles.stepContent}>
                  <View style={styles.modalIconWrapper}>
                    <Icon name="key-outline" size={28} color="#D32F2F" />
                  </View>

                  <Text style={styles.stepTitle}>Enter verification PIN</Text>
                  <Text style={styles.stepDescription}>
                    Type the 4-digit code sent to your email address.
                  </Text>

                  {!!forgotPasswordVerifiedEmail && (
                    <Text style={styles.stepDescription}>
                      Account email: {forgotPasswordVerifiedEmail}
                    </Text>
                  )}

                  <View style={styles.otpContainer}>
                    <View
                      style={[
                        styles.otpWrapper,
                        {
                          columnGap: isSmallScreen ? 8 : isTablet ? 10 : 12,
                        },
                      ]}
                    >
                      {verificationPin.map((digit, index) => (
                        <TextInput
                          key={index}
                          ref={(ref) => {
                            otpRefs.current[index] = ref;
                          }}
                          style={[
                            styles.otpInput,
                            {
                              flex: 1,
                              maxWidth: isSmallScreen ? 52 : isTablet ? 70 : 64,
                              height: isSmallScreen ? 52 : isTablet ? 64 : 58,
                              fontSize: isSmallScreen ? 20 : isTablet ? 24 : 22,
                              lineHeight: isSmallScreen ? 20 : isTablet ? 24 : 22,
                              borderRadius: isSmallScreen ? 12 : 14,
                            },
                            digit && styles.otpInputFilled,
                          ]}
                          value={digit}
                          onChangeText={(text) => handleOtpChange(text, index)}
                          onKeyPress={(e) => handleOtpKeyPress(e, index)}
                          keyboardType="number-pad"
                          maxLength={1}
                          autoFocus={index === 0}
                          editable={!isLoading}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.modalActionRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => setForgotStep(1)}
                      disabled={isLoading}
                    >
                      <Text style={styles.secondaryButtonText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryButtonCompact, isLoading && styles.disabledButton]}
                      onPress={handlePinVerification}
                      disabled={isLoading}
                    >
                      <Text style={styles.primaryButtonText}>
                        {isLoading ? 'Verifying...' : 'Verify PIN'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {forgotStep === 3 && (
                <View style={styles.stepContent}>
                  <View style={styles.modalIconWrapper}>
                    <Icon name="lock-closed-outline" size={28} color="#D32F2F" />
                  </View>

                  <Text style={styles.stepTitle}>Create a new password</Text>
                  <Text style={styles.stepDescription}>
                    Use a strong password and make sure both fields match.
                  </Text>

                  <View style={[styles.passwordFieldWrapper, isNewPasswordFocused && styles.passwordFieldWrapperFocused]}>
                    <Icon
                      name="lock-closed-outline"
                      size={18}
                      color="#888"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.passwordFieldInput}
                      placeholder="New password"
                      placeholderTextColor="#9E9E9E"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      editable={!isLoading}
                      onFocus={() => setIsNewPasswordFocused(true)}
                      onBlur={() => setIsNewPasswordFocused(false)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.iconButton}
                      disabled={isLoading}
                    >
                      <Icon
                        name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#888"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.passwordFieldWrapper, isConfirmNewPasswordFocused && styles.passwordFieldWrapperFocused]}>
                    <Icon
                      name="lock-closed-outline"
                      size={18}
                      color="#888"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.passwordFieldInput}
                      placeholder="Confirm new password"
                      placeholderTextColor="#9E9E9E"
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                      secureTextEntry={!showConfirmNewPassword}
                      autoCapitalize="none"
                      editable={!isLoading}
                       returnKeyType="done"
                      onSubmitEditing={handlePasswordReset}
                      onFocus={() => setIsConfirmNewPasswordFocused(true)}
                      onBlur={() => setIsConfirmNewPasswordFocused(false)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      style={styles.iconButton}
                      disabled={isLoading}
                    >
                      <Icon
                        name={showConfirmNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#888"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalActionRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => setForgotStep(2)}
                      disabled={isLoading}
                    >
                      <Text style={styles.secondaryButtonText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryButtonCompact, isLoading && styles.disabledButton]}
                      onPress={handlePasswordReset}
                      disabled={isLoading}
                    >
                      <Text style={styles.primaryButtonText}>
                        {isLoading ? 'Saving...' : 'Save Password'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* First-login setup modal */}
      <Modal
        visible={firstLoginVisible}
        transparent
        animationType="fade"
        onRequestClose={resetFirstLoginState}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrapper}
          >
            <View style={styles.modalCard}>
              <TouchableOpacity
                onPress={resetFirstLoginState}
                style={styles.modalCloseButton}
              >
                <Icon name="close-outline" size={24} color="#444" />
              </TouchableOpacity>

              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>First-Time Setup</Text>
                  <Text style={styles.modalSubtitle}>
                    Enter your 4-digit PIN, then set your real password.
                  </Text>
                </View>
              </View>

              {renderFirstLoginStepIndicator()}

              {firstLoginStep === 1 && (
                <View style={styles.stepContent}>
                  <View style={styles.modalIconWrapper}>
                    <Icon name="key-outline" size={28} color="#D32F2F" />
                  </View>

                  <Text style={styles.stepTitle}>Enter your first-login PIN</Text>
                  <Text style={styles.stepDescription}>
                    Type the 4-digit PIN sent to your email.
                  </Text>

                  {!!pendingEmail && (
                    <Text style={styles.stepDescription}>Account email: {pendingEmail}</Text>
                  )}

                  <View style={styles.otpContainer}>
                    <View
                      style={[
                        styles.otpWrapper,
                        {
                          columnGap: isSmallScreen ? 8 : isTablet ? 10 : 12,
                        },
                      ]}
                    >
                      {verificationPin.map((digit, index) => (
                        <TextInput
                          key={index}
                          ref={(ref) => {
                            otpRefs.current[index] = ref;
                          }}
                          style={[
                            styles.otpInput,
                            {
                              flex: 1,
                              maxWidth: isSmallScreen ? 52 : isTablet ? 70 : 64,
                              height: isSmallScreen ? 52 : isTablet ? 64 : 58,
                              fontSize: isSmallScreen ? 20 : isTablet ? 24 : 22,
                              lineHeight: isSmallScreen ? 20 : isTablet ? 24 : 22,
                              borderRadius: isSmallScreen ? 12 : 14,
                            },
                            digit && styles.otpInputFilled,
                          ]}
                          value={digit}
                          onChangeText={(text) => handleOtpChange(text, index)}
                          onKeyPress={(e) => handleOtpKeyPress(e, index)}
                          keyboardType="number-pad"
                          maxLength={1}
                          autoFocus={index === 0}
                          editable={!isLoading}
                        />
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, isLoading && styles.disabledButton]}
                    onPress={handleFirstLoginPinVerification}
                    activeOpacity={0.85}
                    disabled={isLoading}
                  >
                    <Text style={styles.primaryButtonText}>
                      {isLoading ? 'Verifying...' : 'Verify PIN'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {firstLoginStep === 2 && (
                <View style={styles.stepContent}>
                  <View style={styles.modalIconWrapper}>
                    <Icon name="lock-closed-outline" size={28} color="#D32F2F" />
                  </View>

                  <Text style={styles.stepTitle}>Set your new password</Text>
                  <Text style={styles.stepDescription}>
                    Create a secure password to finish setting up your account.
                  </Text>

                  <View style={[styles.passwordFieldWrapper, isNewPasswordFocused && styles.passwordFieldWrapperFocused]}>
                    <Icon
                      name="lock-closed-outline"
                      size={18}
                      color="#888"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.passwordFieldInput}
                      placeholder="New password"
                      placeholderTextColor="#9E9E9E"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      editable={!isLoading}
                      onFocus={() => setIsNewPasswordFocused(true)}
                      onBlur={() => setIsNewPasswordFocused(false)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.iconButton}
                      disabled={isLoading}
                    >
                      <Icon
                        name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#888"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.passwordFieldWrapper, isConfirmNewPasswordFocused && styles.passwordFieldWrapperFocused]}>
                    <Icon
                      name="lock-closed-outline"
                      size={18}
                      color="#888"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.passwordFieldInput}
                      placeholder="Confirm new password"
                      placeholderTextColor="#9E9E9E"
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                      secureTextEntry={!showConfirmNewPassword}
                      autoCapitalize="none"
                      editable={!isLoading}
                       returnKeyType="done"
                      onSubmitEditing={handlePasswordReset}
                      onFocus={() => setIsConfirmNewPasswordFocused(true)}
                      onBlur={() => setIsConfirmNewPasswordFocused(false)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      style={styles.iconButton}
                      disabled={isLoading}
                    >
                      <Icon
                        name={showConfirmNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#888"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalActionRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => setFirstLoginStep(1)}
                      disabled={isLoading}
                    >
                      <Text style={styles.secondaryButtonText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryButtonCompact, isLoading && styles.disabledButton]}
                      onPress={handleFirstLoginPasswordSetup}
                      disabled={isLoading}
                    >
                      <Text style={styles.primaryButtonText}>
                        {isLoading ? 'Saving...' : 'Save Password'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Toast — portal-based, matches Community/Dashboard/ClassesScreen so
          login/reset/setup feedback looks and behaves the same everywhere. */}
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // ── Root / split (two-column) layout for large screens (matches Register) ─
  rootContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  splitContainer: { flex: 1, flexDirection: 'row' },

  leftPanel: { flex: 1, maxWidth: '48%' },
  leftPanelBg: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    paddingVertical: 40,
  },
  leftPanelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 18, 32, 0.58)',
  },
  leftBackButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftPanelContent: { flex: 1, justifyContent: 'flex-end' },
  leftLogoWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#780000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F2F4F7',
  },
  leftLogoImage: { width: 58, height: 58 },
  leftQuote: {
    fontSize: 27,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 37,
    marginBottom: 14,
  },
  leftQuoteAuthor: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },

  rightPanel: { flex: 1, backgroundColor: '#FFFFFF' },
  rightScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 56,
    paddingVertical: 18,
  },
  formWrapperLarge: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  headingSplit: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'left',
  },
  subheadingSplit: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 28,
    textAlign: 'left',
  },
  forgotPasswordLeft: { textAlign: 'left' },

  // ── Full-screen layout (used on small/medium screens) ─────────────────────
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fullScreenScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  fullScreenWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },

  // ── Original single-card layout (kept for reference / other screens) ─────
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 18, 32, 0.58)',
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 32,
  },
  pageWrapper: {
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 10,
  },
  brandBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoFloatingContainer: {
    width: 104,
    height: 104,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#780000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 50,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F2F4F7',
  },
  logoImage: {
    width: 72,
    height: 72,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  subheading: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 26,
  },
  formGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
  },
  // Applied alongside inputWrapper when the inner TextInput is focused,
  // matching the highlighted-border focus behavior used across the app.
  inputWrapperFocused: {
    borderColor: '#D32F2F',
    borderWidth: 1.5,
  },
  inputWithIcon: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 15,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingLeft: 14,
  },
  // Applied alongside passwordContainer when the inner TextInput is focused.
  passwordContainerFocused: {
    borderColor: '#D32F2F',
    borderWidth: 1.5,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#111827',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  inputIcon: {
    marginRight: 10,
  },
  iconButton: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPassword: {
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 18,
  },
  logInButton: {
    width: '100%',
    backgroundColor: '#D32F2F',
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D32F2F',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.7,
  },
  logInText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
  registerButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalKeyboardWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 8,
    position: 'relative',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalHeaderText: {
    paddingRight: 44,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1C',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    maxWidth: 280,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#D7D7D7',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#D32F2F',
    borderColor: '#D32F2F',
  },
  stepCircleCompleted: {
    backgroundColor: '#D32F2F',
    borderColor: '#D32F2F',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7A7A7A',
  },
  stepNumberActive: {
    color: '#FFF',
  },
  stepLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#8C8C8C',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#D32F2F',
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E4E4E4',
    marginHorizontal: 10,
    marginBottom: 18,
  },
  stepLineActive: {
    backgroundColor: '#D32F2F',
  },
  stepContent: {
    marginTop: 6,
  },
  modalIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FDECEC',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1F1F',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E7E7E7',
    borderRadius: 14,
    marginBottom: 18,
    paddingHorizontal: 14,
  },
  // Applied alongside modalInputWrapper when the inner TextInput is focused.
  modalInputWrapperFocused: {
    borderColor: '#D32F2F',
    borderWidth: 1.5,
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    color: '#111',
    paddingVertical: 15,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  otpContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  otpWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#F8F8F8',
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    includeFontPadding: false,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  otpInputFilled: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFF5F5',
  },
  primaryButton: {
    height: 52,
    backgroundColor: '#D32F2F',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonCompact: {
    flex: 1,
    height: 52,
    backgroundColor: '#D32F2F',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D32F2F',
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#D32F2F',
    fontSize: 15,
    fontWeight: '700',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  passwordFieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E7E7E7',
    borderRadius: 14,
    marginBottom: 14,
    paddingLeft: 14,
  },
  // Applied alongside passwordFieldWrapper when the inner TextInput is focused.
  passwordFieldWrapperFocused: {
    borderColor: '#D32F2F',
    borderWidth: 1.5,
  },
  passwordFieldInput: {
    flex: 1,
    fontSize: 15,
    color: '#111',
    paddingVertical: 15,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },

  // ✅ Toast portal — matches Community/Dashboard/ClassesScreen; lets touches
  // pass through to whatever's behind, except the toast itself.
  toastPortal: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default SignIn;