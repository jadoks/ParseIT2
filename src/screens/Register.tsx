import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

type UserType = 'student' | 'teacher';
type FeedbackType = 'success' | 'error' | 'info';
type PolicyView = 'terms' | 'privacy';

interface RegisterProps {
  onBack?: () => void;
  onRegisterSuccess?: () => void;
  onGoToLanding?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function getApiBaseUrl() {
  if (Platform.OS === 'web') return 'http://localhost:5000';

  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';

  const host = possibleHost.split(':')[0];
  return host ? `http://${host}:5000` : 'http://192.168.1.5:5000';
}

const API_BASE_URL = getApiBaseUrl();

// ─── BirthdayField (matches AddStudentModal exactly) ─────────────────────────

function BirthdayField({
  value,
  onChange,
  isMobile,
}: {
  value: Date | null;
  onChange: (date: Date) => void;
  isMobile: boolean;
}) {
  const [showNativePicker, setShowNativePicker] = useState(false);
  const [showWebModal, setShowWebModal] = useState(false);
  const [tempMonth, setTempMonth] = useState(0);
  const [tempDay, setTempDay] = useState(1);
  const [tempYear, setTempYear] = useState(2000);

  const years = Array.from(
    { length: 100 },
    (_, i) => new Date().getFullYear() - i
  );

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysInMonth = new Date(tempYear, tempMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const openPicker = () => {
    const baseDate = value || new Date(2000, 0, 1);
    setTempMonth(baseDate.getMonth());
    setTempDay(baseDate.getDate());
    setTempYear(baseDate.getFullYear());

    if (Platform.OS === 'web') {
      setShowWebModal(true);
      return;
    }
    setShowNativePicker(true);
  };

  const handleNativeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === 'android') setShowNativePicker(false);
    if (event.type === 'dismissed') return;

    if (selectedDate) {
      onChange(selectedDate);
      setTempMonth(selectedDate.getMonth());
      setTempDay(selectedDate.getDate());
      setTempYear(selectedDate.getFullYear());
    }
  };

  const confirmWebBirthday = () => {
    onChange(new Date(tempYear, tempMonth, tempDay));
    setShowWebModal(false);
  };

  return (
    <>
      <Text style={bdStyles.fieldLabel}>Birthday</Text>
      <TouchableOpacity
        style={bdStyles.selectField}
        activeOpacity={0.85}
        onPress={openPicker}
      >
        <Text
          style={[
            bdStyles.selectFieldText,
            !value && bdStyles.placeholderSelectText,
          ]}
        >
          {value ? formatDate(value) : 'Select birthday'}
        </Text>
        <Ionicons name="calendar-outline" size={18} color="#7A7A7A" />
      </TouchableOpacity>

      {/* Native picker (iOS / Android) */}
      {Platform.OS !== 'web' && showNativePicker && (
        <View style={bdStyles.datePickerWrap}>
          <DateTimePicker
            value={value || new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={handleNativeChange}
          />

          {Platform.OS === 'ios' && (
            <View style={bdStyles.datePickerActions}>
              <TouchableOpacity
                style={bdStyles.datePickerButtonSecondary}
                activeOpacity={0.85}
                onPress={() => setShowNativePicker(false)}
              >
                <Text style={bdStyles.datePickerButtonSecondaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Web / fallback modal picker */}
      <Modal
        visible={showWebModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowWebModal(false)}
      >
        <View style={bdStyles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowWebModal(false)}
          />

          <View style={bdStyles.webDateModalCard}>
            {/* Header */}
            <View style={bdStyles.modalHeader}>
              <View style={bdStyles.modalHeaderLeft}>
                <View style={bdStyles.modalIconBox}>
                  <Ionicons name="calendar-outline" size={22} color="#DC2626" />
                </View>
                <View style={bdStyles.modalHeaderTextWrap}>
                  <Text style={bdStyles.modalTitle}>Select Birthday</Text>
                  <Text style={bdStyles.modalSubtitle}>
                    Choose month, day, and year.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={bdStyles.modalCloseButton}
                onPress={() => setShowWebModal(false)}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color="#7A4A4A" />
              </TouchableOpacity>
            </View>

            {/* Scrollable columns */}
            <View style={bdStyles.webDateContent}>
              <View style={[bdStyles.modalRow, isMobile && bdStyles.modalRowStack]}>
                {/* Month */}
                <View style={bdStyles.modalCol}>
                  <Text style={bdStyles.fieldLabel}>Month</Text>
                  <ScrollView
                    style={bdStyles.webDateList}
                    showsVerticalScrollIndicator={false}
                  >
                    {months.map((month, index) => {
                      const active = tempMonth === index;
                      return (
                        <TouchableOpacity
                          key={month}
                          style={[
                            bdStyles.dropdownItem,
                            active && bdStyles.dropdownItemActive,
                            bdStyles.dropdownItemBorder,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => {
                            setTempMonth(index);
                            const maxDay = new Date(tempYear, index + 1, 0).getDate();
                            if (tempDay > maxDay) setTempDay(maxDay);
                          }}
                        >
                          <Text
                            style={[
                              bdStyles.dropdownItemText,
                              active && bdStyles.dropdownItemTextActive,
                            ]}
                          >
                            {month}
                          </Text>
                          {active && (
                            <Ionicons name="checkmark-circle" size={18} color="#DC2626" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Day */}
                <View style={bdStyles.modalCol}>
                  <Text style={bdStyles.fieldLabel}>Day</Text>
                  <ScrollView
                    style={bdStyles.webDateList}
                    showsVerticalScrollIndicator={false}
                  >
                    {days.map((day) => {
                      const active = tempDay === day;
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[
                            bdStyles.dropdownItem,
                            active && bdStyles.dropdownItemActive,
                            bdStyles.dropdownItemBorder,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => setTempDay(day)}
                        >
                          <Text
                            style={[
                              bdStyles.dropdownItemText,
                              active && bdStyles.dropdownItemTextActive,
                            ]}
                          >
                            {day}
                          </Text>
                          {active && (
                            <Ionicons name="checkmark-circle" size={18} color="#DC2626" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Year */}
                <View style={bdStyles.modalCol}>
                  <Text style={bdStyles.fieldLabel}>Year</Text>
                  <ScrollView
                    style={bdStyles.webDateList}
                    showsVerticalScrollIndicator={false}
                  >
                    {years.map((year) => {
                      const active = tempYear === year;
                      return (
                        <TouchableOpacity
                          key={year}
                          style={[
                            bdStyles.dropdownItem,
                            active && bdStyles.dropdownItemActive,
                            bdStyles.dropdownItemBorder,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => {
                            setTempYear(year);
                            const maxDay = new Date(year, tempMonth + 1, 0).getDate();
                            if (tempDay > maxDay) setTempDay(maxDay);
                          }}
                        >
                          <Text
                            style={[
                              bdStyles.dropdownItemText,
                              active && bdStyles.dropdownItemTextActive,
                            ]}
                          >
                            {year}
                          </Text>
                          {active && (
                            <Ionicons name="checkmark-circle" size={18} color="#DC2626" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={bdStyles.modalFooter}>
              <TouchableOpacity
                style={bdStyles.modalSecondaryButton}
                onPress={() => setShowWebModal(false)}
                activeOpacity={0.85}
              >
                <Text style={bdStyles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={bdStyles.modalPrimaryButton}
                activeOpacity={0.85}
                onPress={confirmWebBirthday}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={bdStyles.modalPrimaryButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── BirthdayField styles (copied 1-to-1 from AddStudentModal) ───────────────

const bdStyles = StyleSheet.create({
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',   // matches register form fieldLabel
    marginBottom: 8,    // matches register form fieldLabel
  },
  selectField: {
    height: 54,         // matches other input heights (paddingVertical:15 * 2 + ~24 font ≈ 54)
    borderRadius: 14,   // matches inputWrapper borderRadius
    borderWidth: 1,
    borderColor: '#E5E7EB',   // matches inputWrapper borderColor
    backgroundColor: '#F9FAFB', // matches inputWrapper backgroundColor
    paddingHorizontal: 14,    // matches inputWrapper paddingHorizontal
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectFieldText: {
    fontSize: 16,       // matches inputWithIcon fontSize
    fontWeight: '400',  // matches normal text input weight
    color: '#111827',   // matches inputWithIcon color
    flex: 1,
    marginRight: 10,
  },
  placeholderSelectText: {
    color: '#9E9E9E',   // matches placeholderTextColor used in other fields
  },
  datePickerWrap: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  datePickerActions: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    alignItems: 'flex-end',
  },
  datePickerButtonSecondary: {
    minWidth: 88,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7C0C0',
    backgroundColor: '#FFF7F7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  datePickerButtonSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A4A4A',
  },
  // modal overlay (behind the date picker modal)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43, 17, 17, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webDateModalCard: {
    width: '100%',
    maxWidth: 860,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#F3D4D4',
    overflow: 'hidden',
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
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2B1111',
    marginBottom: 4,
  },
  modalSubtitle: {
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
  webDateContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 22,
    zIndex: 20,
  },
  modalRowStack: {
    flexDirection: 'column',
    gap: 14,
  },
  modalCol: {
    flex: 1,
  },
  webDateList: {
    maxHeight: 260,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1CACA',
    backgroundColor: '#FFF9F9',
  },
  dropdownItem: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#FAE9E9',
  },
  dropdownItemActive: {
    backgroundColor: '#FFF7F7',
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 14,
    color: '#5F3B3B',
    fontWeight: '600',
    paddingRight: 10,
  },
  dropdownItemTextActive: {
    color: '#DC2626',
    fontWeight: '700',
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: '#F8E3E3',
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  },
  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

// ─── TermsPrivacyModal (full-screen, split by view, back button) ─────────────

const TERMS_SECTIONS = [
  {
    title: '1. Use of Service',
    body:
      "ParseIT Hub provides a platform for adaptive learning and academic support. You must use this service responsibly and ethically. Any attempt to cheat or manipulate the certification, grading, or AI Assistant process is strictly prohibited.",
  },
  {
    title: '2. User Accounts',
    body:
      'You are responsible for maintaining the confidentiality of your account and password. Do not share your account information with others. You are solely responsible for all activities that occur under your account.',
  },
  {
    title: '3. Content',
    body:
      'By using ParseIT Hub, you may encounter content from Module Lessons, other users, and the AI Assistant. We do not guarantee the accuracy of AI-generated content. You are responsible for verifying such information before relying on it academically.',
  },
  {
    title: '4. Acceptable Use',
    body:
      'You agree not to upload harmful software or files, misuse or cheat with AI-generated responses, upload copyrighted material without permission, harass or abuse other users, attempt unauthorized access, or exploit bugs and vulnerabilities.',
  },
  {
    title: '5. Intellectual Property',
    body:
      "The application's features, source code, branding, Module Lessons, and other materials created by the development team belong to the ParseIT Hub developers unless stated otherwise. You keep ownership of the content you upload.",
  },
  {
    title: '6. Changes to Terms',
    body:
      'We reserve the right to modify or replace these Terms at any time. It is your responsibility to check the Terms periodically for changes.',
  },
  {
    title: '7. Contact Us',
    body:
      'If you have any questions about these Terms, please contact the ParseIT Hub administrators or the BSIT Department of Cebu Technological University – Argao Campus.',
  },
];

const PRIVACY_SECTIONS = [
  {
    title: '1. Our Commitment',
    body:
      'ParseIT Hub protects your personal information in line with the Data Privacy Act of 2012 (Republic Act No. 10173). This policy explains how your data is collected, used, stored, and safeguarded.',
  },
  {
    title: '2. Information We Collect',
    body:
      'Depending on your role, we may collect personal details (name, student or employee ID, email, birthdate, photo, role), academic information (enrolled classes, Module Lessons progress, assignment submissions, quiz results, grades), system information (device, login activity, IP address, app version, crash and usage logs), and AI interaction data such as prompts and questions submitted to the AI Assistant.',
  },
  {
    title: '3. How We Use It',
    body:
      'Your information helps us authenticate accounts, deliver Module Lessons and other educational services, manage classes and assignments, generate academic analytics, personalize AI tutoring, monitor progress, and maintain platform security.',
  },
  {
    title: '4. Storage and Security',
    body:
      'Your data is stored securely using Firebase cloud services and protected with role-based access controls, encrypted HTTPS communication, secure authentication, and session management.',
  },
  {
    title: '5. Data Sharing',
    body:
      "ParseIT Hub does not sell your personal information. It's only shared with authorized teachers and administrators, when required by law, or when necessary to operate the platform's services.",
  },
  {
    title: '6. Your Rights',
    body:
      'You may access your personal information, request corrections, request deletion of eligible data (subject to institutional policy), request a copy of your data where applicable, and report privacy concerns.',
  },
  {
    title: '7. Changes to This Policy',
    body:
      "This policy may be updated from time to time. You'll be notified of significant changes through the application, and continued use after changes are made means you accept the updated terms.",
  },
  {
    title: '8. Contact',
    body:
      'Questions about this Privacy Policy can be directed to the ParseIT Hub administrators or the BSIT Department of Cebu Technological University – Argao Campus.',
  },
];

function TermsPrivacyModal({
  visible,
  view,
  onClose,
}: {
  visible: boolean;
  view: PolicyView;
  onClose: () => void;
}) {
  const isTerms = view === 'terms';
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={termsStyles.overlay}>
        <ScrollView
          style={termsStyles.body}
          contentContainerStyle={termsStyles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={termsStyles.title}>
            {isTerms ? 'Terms of Service' : 'Privacy Policy'}
          </Text>
          <Text style={termsStyles.intro}>
            {isTerms
              ? 'Welcome to ParseIT Hub. By using our service, you agree to these terms. Please read them carefully.'
              : 'ParseIT Hub values your privacy. This policy explains how we collect, use, and protect your personal information.'}
          </Text>

          {sections.map((section) => (
            <View key={section.title} style={termsStyles.sectionCard}>
              <Text style={termsStyles.sectionTitle}>{section.title}</Text>
              <Text style={termsStyles.paragraph}>{section.body}</Text>
            </View>
          ))}

          <TouchableOpacity
            style={termsStyles.backButtonRow}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={18} color="#111827" />
            <Text style={termsStyles.backButtonText}>Back to previous page</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const termsStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
    paddingBottom: 48,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  intro: {
    fontSize: 16,
    lineHeight: 24,
    color: '#6B7280',
    marginBottom: 24,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#6B7280',
  },
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 8,
    gap: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
});

// ─── Register ─────────────────────────────────────────────────────────────────

export default function Register({
  onBack,
  onRegisterSuccess,
  onGoToLanding,
}: RegisterProps) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  const [userId, setUserId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null); // ← now a Date | null
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState<UserType>('student');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [policyView, setPolicyView] = useState<PolicyView>('terms');
  const [policyModalVisible, setPolicyModalVisible] = useState(false);

  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('info');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackOnClose, setFeedbackOnClose] = useState<(() => void) | null>(null);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const showFeedback = (
    type: FeedbackType,
    title: string,
    message: string,
    onClose?: () => void
  ) => {
    setFeedbackType(type);
    setFeedbackTitle(title);
    setFeedbackMessage(message);
    setFeedbackOnClose(() => onClose || null);
    setFeedbackVisible(true);
  };

  const closeFeedback = () => {
    setFeedbackVisible(false);
    const callback = feedbackOnClose;
    setFeedbackOnClose(null);
    if (callback) callback();
  };

  const handleRegister = async () => {
    const birthdayStr = birthday ? formatDate(birthday) : '';

    if (
      !userId.trim() ||
      !firstName.trim() ||
      !lastName.trim() ||
      !birthdayStr ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      showFeedback('error', 'Missing Fields', 'Please complete all fields.');
      return;
    }

    if (!isValidEmail(email)) {
      showFeedback('error', 'Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      showFeedback('error', 'Weak Password', 'Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      showFeedback('error', 'Password Mismatch', 'Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        id: userId,
        role: userType,
        firstName,
        lastName,
        birthday: birthdayStr,
        email,
        password,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || 'Registration failed.');

      showFeedback('success', 'Success', 'Account successfully created!', () => {
        setTimeout(() => {
          onRegisterSuccess?.();
          onBack?.();
        }, 50);
      });
    } catch (error: any) {
      showFeedback(
        'error',
        'Registration Failed',
        error?.message || 'Unable to create account.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getFeedbackColor = () => {
    if (feedbackType === 'success') return '#16A34A';
    if (feedbackType === 'error') return '#D32F2F';
    return '#2563EB';
  };

  const getFeedbackIcon = () => {
    if (feedbackType === 'success') return 'checkmark-circle';
    if (feedbackType === 'error') return 'close-circle';
    return 'information-circle';
  };

  // isMobile used by BirthdayField to stack columns inside the picker modal
  const isMobile = width < 600;

  return (
    <ImageBackground
      source={require('../../assets/images/cote.jpeg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.backgroundOverlay} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.screen}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.pageWrapper, { maxWidth: isLargeScreen ? 700 : 420 }]}>
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.brandBlock}
                onPress={() => onGoToLanding?.()}
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

              <Text style={styles.heading}>Create Account</Text>
              <Text style={styles.subheading}>Sign up as Student or Teacher</Text>

              {/* ── ROW 1: Role Selection (Pill Container) ── */}
              <View style={[
                styles.roleSelectionRow,
                isLargeScreen && styles.roleSelectionRowLarge
              ]}>
                <View style={[
                  styles.roleSelectionContainer,
                  isLargeScreen && styles.roleSelectionContainerLarge
                ]}>
                  <Text style={styles.roleSelectionLabel}>Choose Your Role</Text>
                  
                  {/* Outer Pill Container */}
                  <View style={[
                    styles.rolePillContainer,
                    isLargeScreen && styles.rolePillContainerLarge
                  ]}>
                    {/* Student Button */}
                    <TouchableOpacity
                      style={[
                        styles.rolePillButton,
                        userType === 'student' && styles.activeRolePillButton,
                        isLargeScreen && styles.rolePillButtonLarge,
                      ]}
                      onPress={() => setUserType('student')}
                      disabled={isLoading}
                      activeOpacity={0.85}
                    >
                      <View style={styles.rolePillContent}>
                        <Ionicons 
                          name="school-outline" 
                          size={isLargeScreen ? 18 : 20} 
                          color={userType === 'student' ? '#FFFFFF' : '#6B7280'} 
                        />
                        <Text 
                          style={[
                            styles.rolePillButtonText, 
                            userType === 'student' && styles.activeRolePillButtonText,
                            isLargeScreen && styles.rolePillButtonTextLarge,
                          ]}
                        >
                          Student
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.rolePillDivider} />

                    {/* Teacher Button */}
                    <TouchableOpacity
                      style={[
                        styles.rolePillButton,
                        userType === 'teacher' && styles.activeRolePillButton,
                        isLargeScreen && styles.rolePillButtonLarge,
                      ]}
                      onPress={() => setUserType('teacher')}
                      disabled={isLoading}
                      activeOpacity={0.85}
                    >
                      <View style={styles.rolePillContent}>
                        <Ionicons 
                          name="book-outline" 
                          size={isLargeScreen ? 18 : 20} 
                          color={userType === 'teacher' ? '#FFFFFF' : '#6B7280'} 
                        />
                        <Text 
                          style={[
                            styles.rolePillButtonText, 
                            userType === 'teacher' && styles.activeRolePillButtonText,
                            isLargeScreen && styles.rolePillButtonTextLarge,
                          ]}
                        >
                          Teacher
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {isLargeScreen ? (
                // ── LARGE SCREEN: 2-column layout ─────────────────────────────
                <>
                  {/* Row 2: User ID · First Name */}
                  <View style={styles.formRow}>
                    <View style={styles.formColumn}>
                      <Text style={styles.fieldLabel}>User ID</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="person-outline" size={18} color="#7A7A7A" style={styles.inputIcon} />
                        <TextInput
                          style={styles.inputWithIcon}
                          placeholder="ID"
                          placeholderTextColor="#9E9E9E"
                          value={userId}
                          onChangeText={(t) => setUserId(t.replace(/[^0-9]/g, ''))}
                          keyboardType="number-pad"
                          editable={!isLoading}
                        />
                      </View>
                    </View>

                    <View style={styles.formColumn}>
                      <Text style={styles.fieldLabel}>First Name</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="person-outline" size={18} color="#7A7A7A" style={styles.inputIcon} />
                        <TextInput
                          style={styles.inputWithIcon}
                          placeholder="First name"
                          placeholderTextColor="#9E9E9E"
                          value={firstName}
                          onChangeText={setFirstName}
                          editable={!isLoading}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Row 3: Last Name · Email */}
                  <View style={styles.formRow}>
                    <View style={styles.formColumn}>
                      <Text style={styles.fieldLabel}>Last Name</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="person-outline" size={18} color="#7A7A7A" style={styles.inputIcon} />
                        <TextInput
                          style={styles.inputWithIcon}
                          placeholder="Last name"
                          placeholderTextColor="#9E9E9E"
                          value={lastName}
                          onChangeText={setLastName}
                          editable={!isLoading}
                        />
                      </View>
                    </View>

                    <View style={styles.formColumn}>
                      <Text style={styles.fieldLabel}>Email</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={18} color="#7A7A7A" style={styles.inputIcon} />
                        <TextInput
                          style={styles.inputWithIcon}
                          placeholder="Email"
                          placeholderTextColor="#9E9E9E"
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          editable={!isLoading}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Row 4: Birthday (full width) */}
                  <View style={styles.formRow}>
                    <View style={[styles.formColumn, { flex: 2 }]}>
                      <BirthdayField
                        value={birthday}
                        onChange={setBirthday}
                        isMobile={isMobile}
                      />
                    </View>
                  </View>

                  {/* Row 5: Password · Confirm Password */}
                  <View style={styles.formRow}>
                    <View style={[styles.formColumn, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Password</Text>
                      <View style={styles.passwordContainer}>
                        <Ionicons name="lock-closed-outline" size={18} color="#7A7A7A" style={styles.inputIcon} />
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="Password"
                          placeholderTextColor="#9E9E9E"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          editable={!isLoading}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.iconButton} disabled={isLoading}>
                          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#7A7A7A" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={[styles.formColumn, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Confirm Password</Text>
                      <View style={styles.passwordContainer}>
                        <Ionicons name="lock-closed-outline" size={18} color="#7A7A7A" style={styles.inputIcon} />
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="Confirm password"
                          placeholderTextColor="#9E9E9E"
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry={!showConfirmPassword}
                          autoCapitalize="none"
                          editable={!isLoading}
                        />
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.iconButton} disabled={isLoading}>
                          <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#7A7A7A" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                // ── SMALL SCREEN: single column ───────────────────────────────
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>User ID</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="person-outline" size={18} color="#7A7A7A" style={styles.inputIcon} />
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="Enter your numeric ID"
                        placeholderTextColor="#9E9E9E"
                        value={userId}
                        onChangeText={(t) => setUserId(t.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>First Name</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="person-outline" size={18} color="#7A7A7A" style={styles.inputIcon} />
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="Enter first name"
                        placeholderTextColor="#9E9E9E"
                        value={firstName}
                        onChangeText={setFirstName}
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Last Name</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="person-outline" size={18} color="#7A7A7A" style={styles.inputIcon} />
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="Enter last name"
                        placeholderTextColor="#9E9E9E"
                        value={lastName}
                        onChangeText={setLastName}
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="mail-outline" size={18} color="#7A7A7A" style={styles.inputIcon} />
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="Enter email address"
                        placeholderTextColor="#9E9E9E"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  {/* ── Birthday picker (single column) ── */}
                  <View style={styles.formGroup}>
                    <BirthdayField
                      value={birthday}
                      onChange={setBirthday}
                      isMobile={isMobile}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Password</Text>
                    <View style={styles.passwordContainer}>
                      <Ionicons name="lock-closed-outline" size={18} color="#7A7A7A" style={styles.inputIcon} />
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Enter password"
                        placeholderTextColor="#9E9E9E"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        editable={!isLoading}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.iconButton} disabled={isLoading}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#7A7A7A" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Confirm Password</Text>
                    <View style={styles.passwordContainer}>
                      <Ionicons name="lock-closed-outline" size={18} color="#7A7A7A" style={styles.inputIcon} />
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Confirm password"
                        placeholderTextColor="#9E9E9E"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        editable={!isLoading}
                      />
                      <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.iconButton} disabled={isLoading}>
                        <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#7A7A7A" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}

              <Text style={styles.termsLabel}>
                By tapping Sign Up, you agree to create an account and to
                ParseIT Hub's{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => {
                    setPolicyView('terms');
                    setPolicyModalVisible(true);
                  }}
                >
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => {
                    setPolicyView('privacy');
                    setPolicyModalVisible(true);
                  }}
                >
                  Privacy Policy
                </Text>
              </Text>

              <TouchableOpacity
                style={[styles.registerButton, isLoading && styles.disabledButton]}
                onPress={handleRegister}
                activeOpacity={0.9}
                disabled={isLoading}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? 'Creating Account...' : 'Sign Up'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={isLoading}>
                <Text style={styles.backButtonText}>Already have an account? Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms of Service / Privacy Policy full-screen page */}
      <TermsPrivacyModal
        visible={policyModalVisible}
        view={policyView}
        onClose={() => setPolicyModalVisible(false)}
      />

      {/* Feedback modal */}
      <Modal visible={feedbackVisible} transparent animationType="fade" onRequestClose={closeFeedback}>
        <View style={styles.feedbackOverlay}>
          <View style={styles.feedbackCard}>
            <View style={[styles.feedbackIconWrapper, { backgroundColor: `${getFeedbackColor()}18` }]}>
              <Ionicons name={getFeedbackIcon() as any} size={40} color={getFeedbackColor()} />
            </View>
            <Text style={styles.feedbackTitle}>{feedbackTitle}</Text>
            <Text style={styles.feedbackMessage}>{feedbackMessage}</Text>
            <TouchableOpacity style={[styles.feedbackButton, { backgroundColor: getFeedbackColor() }]} onPress={closeFeedback}>
              <Text style={styles.feedbackButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

// ─── Register styles (updated with pill container role selection) ─────────────

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  backgroundOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11, 18, 32, 0.58)' },
  screen: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 32,
  },
  pageWrapper: { width: '100%', alignSelf: 'center' },
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
  brandBlock: { alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoFloatingContainer: {
    width: 104, height: 104, borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#780000', shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 10 }, shadowRadius: 50,
    elevation: 10, borderWidth: 1, borderColor: '#F2F4F7',
  },
  logoImage: { width: 72, height: 72 },
  heading: { fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 10 },
  subheading: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 26 },
  
  // ── Role Selection Styles (Pill Container) ──
  roleSelectionRow: {
    marginBottom: 24,
  },
  roleSelectionRowLarge: {
    alignItems: 'center',
  },
  roleSelectionContainer: {
    width: '100%',
  },
  roleSelectionContainerLarge: {
    width: '50%',
    maxWidth: 320,
  },
  roleSelectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  
  // Outer Pill Container
  rolePillContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  rolePillContainerLarge: {
    borderRadius: 14,
    padding: 3,
  },
  
  // Individual Role Buttons
  rolePillButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolePillButtonLarge: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  activeRolePillButton: {
    backgroundColor: '#D32F2F',
    shadowColor: '#D32F2F',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Divider between buttons
  rolePillDivider: {
    width: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 2,
  },
  
  // Button Content
  rolePillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolePillButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  rolePillButtonTextLarge: {
    fontSize: 13,
  },
  activeRolePillButtonText: {
    color: '#FFFFFF',
  },
  
  formGroup: { marginBottom: 16 },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  formColumn: { flex: 1 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  inputWrapper: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1,
    borderColor: '#E5E7EB', paddingHorizontal: 14,
  },
  inputWithIcon: { flex: 1, fontSize: 16, color: '#111827', paddingVertical: 15 },
  passwordContainer: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1,
    borderColor: '#E5E7EB', paddingLeft: 14,
  },
  passwordInput: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#111827' },
  inputIcon: { marginRight: 10 },
  iconButton: { paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  typeContainer: { flexDirection: 'row', gap: 12 },
  typeContainerCompact: { flexDirection: 'row', gap: 8 },
  typeButton: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: '#F9FAFB',
  },
  typeButtonCompact: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#F9FAFB',
  },
  activeTypeButton: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
  typeText: { fontWeight: '700', fontSize: 15, color: '#374151' },
  typeTextCompact: { fontWeight: '700', fontSize: 13, color: '#374151' },
  activeTypeText: { color: '#FFF' },
  termsLabel: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 22,
  },
  termsLink: {
    color: '#D32F2F',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  registerButton: {
    width: '100%', backgroundColor: '#D32F2F', borderRadius: 14,
    paddingVertical: 16, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#D32F2F', shadowOpacity: 0.22, shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16, elevation: 6, marginTop: 12,
  },
  disabledButton: { opacity: 0.7 },
  registerButtonText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  backButton: { marginTop: 16, alignItems: 'center' },
  backButtonText: { color: '#D32F2F', fontSize: 14, fontWeight: '700' },
  feedbackOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  feedbackCard: {
    width: '100%', maxWidth: 360, backgroundColor: '#FFF', borderRadius: 24,
    paddingHorizontal: 24, paddingVertical: 28, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.22, shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20, elevation: 10,
  },
  feedbackIconWrapper: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  feedbackTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 },
  feedbackMessage: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 22 },
  feedbackButton: { minWidth: 120, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center' },
  feedbackButtonText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});