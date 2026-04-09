import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import Icon from 'react-native-vector-icons/Ionicons';

interface SignInProps {
  onLogIn?: (role: 'student' | 'teacher' | 'admin') => void;
  onGoToLanding?: () => void;
}

type ForgotStep = 1 | 2 | 3;

const SignIn = ({ onLogIn, onGoToLanding }: SignInProps) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | 'admin' | null>(null);

  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>(1);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [verificationPin, setVerificationPin] = useState(['', '', '', '']);
  const otpRefs = useRef<Array<TextInput | null>>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const isSmallScreen = width < 480;
  const isTablet = width >= 768;

  const demoAccounts = {
    student: { id: 'STU12345', password: 'student123', role: 'student' as const },
    teacher: { id: 'TCH67890', password: 'teacher456', role: 'teacher' as const },
    admin: { id: 'ADM00001', password: 'admin789', role: 'admin' as const },
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const otpValue = verificationPin.join('');
  const isPinValid = useMemo(() => /^\d{4}$/.test(otpValue), [otpValue]);

  const resetForgotPasswordState = () => {
    setForgotVisible(false);
    setForgotStep(1);
    setRecoveryEmail('');
    setVerificationPin(['', '', '', '']);
    setNewPassword('');
    setConfirmNewPassword('');
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  };

  const handleDemoLogin = (role: 'student' | 'teacher' | 'admin') => {
    const account = demoAccounts[role];
    setId(account.id);
    setPassword(account.password);
    setSelectedRole(role);
  };

  const handleLogIn = () => {
    if (!id.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your ID and password.');
      return;
    }

    const enteredId = id.trim().toUpperCase();
    const enteredPass = password.trim();

    let valid = false;
    let role: 'student' | 'teacher' | 'admin' | null = null;

    if (enteredId === demoAccounts.student.id && enteredPass === demoAccounts.student.password) {
      valid = true;
      role = 'student';
    } else if (enteredId === demoAccounts.teacher.id && enteredPass === demoAccounts.teacher.password) {
      valid = true;
      role = 'teacher';
    } else if (enteredId === demoAccounts.admin.id && enteredPass === demoAccounts.admin.password) {
      valid = true;
      role = 'admin';
    }

    if (valid && role) {
      console.log(`Login successful as ${role} - ID: ${enteredId}`);
      onLogIn?.(role);
    } else {
      Alert.alert(
        'Login Failed',
        'Invalid ID or password.\n\nTry one of the demo accounts:\n' +
          'Student: STU12345 / student123\n' +
          'Teacher: TCH67890 / teacher456\n' +
          'Admin: ADM00001 / admin789'
      );
    }
  };

  const handleGoToLanding = () => {
    if (typeof onGoToLanding === 'function') {
      onGoToLanding();
    } else {
      console.warn('onGoToLanding was not provided to SignIn');
    }
  };

  const handleForgotPassword = () => {
    setForgotVisible(true);
    setForgotStep(1);
  };

  const handleEmailVerification = () => {
    if (!recoveryEmail.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    if (!isValidEmail(recoveryEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    Alert.alert(
      'Verification Sent',
      `A 4-digit verification code has been sent to ${recoveryEmail.trim()}.`
    );
    setForgotStep(2);
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

  const handlePinVerification = () => {
    if (!otpValue) {
      Alert.alert('PIN Required', 'Please enter the 4-digit verification code.');
      return;
    }

    if (!isPinValid) {
      Alert.alert('Invalid PIN', 'The PIN must be exactly 4 digits.');
      return;
    }

    setForgotStep(3);
  };

  const handlePasswordReset = () => {
    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      Alert.alert('Missing Fields', 'Please fill in both password fields.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Weak Password', 'Your new password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Password Mismatch', 'New password and confirmation password do not match.');
      return;
    }

    Alert.alert('Success', 'Your password has been reset successfully.', [
      {
        text: 'OK',
        onPress: () => {
          resetForgotPasswordState();
        },
      },
    ]);
  };

  const renderStepIndicator = () => {
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

  return (
    <ImageBackground
      source={require('../../assets/images/cote.jpeg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { width: isLargeScreen ? '30%' : '100%' }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.logoContainer}
            onPress={handleGoToLanding}
            activeOpacity={0.85}
          >
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <Text style={styles.heading}>Welcome, Parsers!</Text>
          <Text style={styles.subheading}>Sign in to continue</Text>

          <View style={styles.demoContainer}>
            <Text style={styles.demoTitle}>Demo Accounts (for testing):</Text>

            <TouchableOpacity
              style={[
                styles.demoButton,
                selectedRole === 'student' && styles.demoButtonActive,
              ]}
              onPress={() => handleDemoLogin('student')}
            >
              <Text
                style={[
                  styles.demoButtonText,
                  selectedRole === 'student' && styles.demoButtonTextActive,
                ]}
              >
                Student
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.demoButton,
                selectedRole === 'teacher' && styles.demoButtonActive,
              ]}
              onPress={() => handleDemoLogin('teacher')}
            >
              <Text
                style={[
                  styles.demoButtonText,
                  selectedRole === 'teacher' && styles.demoButtonTextActive,
                ]}
              >
                Teacher
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.demoButton,
                selectedRole === 'admin' && styles.demoButtonActive,
              ]}
              onPress={() => handleDemoLogin('admin')}
            >
              <Text
                style={[
                  styles.demoButtonText,
                  selectedRole === 'admin' && styles.demoButtonTextActive,
                ]}
              >
                Admin
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrapper}>
            <Icon name="person-outline" size={18} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Enter ID"
              placeholderTextColor="#9E9E9E"
              value={id}
              onChangeText={setId}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.passwordContainer}>
            <Icon name="lock-closed-outline" size={18} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter Password"
              placeholderTextColor="#9E9E9E"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.iconButton}
            >
              <Icon
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#8A8A8A"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.logInButton}
            onPress={handleLogIn}
            activeOpacity={0.85}
          >
            <Text style={styles.logInText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

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

              {renderStepIndicator()}

              {forgotStep === 1 && (
                <View style={styles.stepContent}>
                  <View style={styles.modalIconWrapper}>
                    <Icon name="mail-open-outline" size={28} color="#D32F2F" />
                  </View>

                  <Text style={styles.stepTitle}>Verify your email</Text>
                  <Text style={styles.stepDescription}>
                    Enter your registered email address to receive a 4-digit verification code.
                  </Text>

                  <View style={styles.modalInputWrapper}>
                    <Icon name="mail-outline" size={18} color="#888" style={styles.inputIcon} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Enter email address"
                      placeholderTextColor="#9E9E9E"
                      value={recoveryEmail}
                      onChangeText={setRecoveryEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleEmailVerification}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryButtonText}>Verify Email</Text>
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
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.modalActionRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => setForgotStep(1)}
                    >
                      <Text style={styles.secondaryButtonText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.primaryButtonCompact}
                      onPress={handlePinVerification}
                    >
                      <Text style={styles.primaryButtonText}>Verify PIN</Text>
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

                  <View style={styles.passwordFieldWrapper}>
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
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.iconButton}
                    >
                      <Icon
                        name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#888"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.passwordFieldWrapper}>
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
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      style={styles.iconButton}
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
                    >
                      <Text style={styles.secondaryButtonText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.primaryButtonCompact}
                      onPress={handlePasswordReset}
                    >
                      <Text style={styles.primaryButtonText}>Save Password</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    alignSelf: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  logoContainer: {
    marginBottom: 32,
    width: wp('20'),
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  heading: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 16,
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  demoContainer: {
    width: '100%',
    marginBottom: 24,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  demoTitle: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  demoButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 12,
    marginVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  demoButtonActive: {
    backgroundColor: '#D32F2F',
    borderColor: '#D32F2F',
  },
  demoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  demoButtonTextActive: {
    color: '#FFF',
  },
  inputWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  inputWithIcon: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 14,
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginBottom: 24,
    paddingLeft: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  iconButton: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logInButton: {
    width: '100%',
    backgroundColor: '#D32F2F',
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 6,
  },
  logInText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  forgotPassword: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
    textDecorationLine: 'none',
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
  inputIcon: {
    marginRight: 10,
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    color: '#111',
    paddingVertical: 15,
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
  passwordFieldInput: {
    flex: 1,
    fontSize: 15,
    color: '#111',
    paddingVertical: 15,
  },
});

export default SignIn;
