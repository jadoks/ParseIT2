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

// ─── TermsPrivacyModal ─────────────────────────────────────────────────────

function TermsPrivacyModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={termsStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={termsStyles.card}>
          <View style={termsStyles.header}>
            <View style={termsStyles.headerLeft}>
              <View style={termsStyles.iconBox}>
                <Ionicons name="document-text-outline" size={22} color="#DC2626" />
              </View>
              <View style={termsStyles.headerTextWrap}>
                <Text style={termsStyles.title}>Terms and Privacy Policy</Text>
                <Text style={termsStyles.subtitle}>
                  Please review before continuing.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={termsStyles.closeButton}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={20} color="#7A4A4A" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={termsStyles.body}
            showsVerticalScrollIndicator={false}
          >
            <Text style={termsStyles.metaText}>Last Updated: July 2026</Text>

            <Text style={termsStyles.groupTitle}>Terms and Conditions</Text>

            <Text style={termsStyles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={termsStyles.paragraph}>
              By registering for or using ParseIT Hub, you agree to follow
              these Terms and Conditions. If you don't agree with any part
              of them, please refrain from using the application.
            </Text>

            <Text style={termsStyles.sectionTitle}>2. What ParseIT Hub Is For</Text>
            <Text style={termsStyles.paragraph}>
              ParseIT Hub is an adaptive learning platform built to support
              students and teachers. It offers AI-powered tutoring, Module
              Lessons for organizing and delivering coursework, assignment
              submission, academic performance analytics, educational games,
              class communication tools, and progress monitoring. The
              platform is meant for educational use only.
            </Text>

            <Text style={termsStyles.sectionTitle}>3. Your Account</Text>
            <Text style={termsStyles.paragraph}>
              You're responsible for giving accurate information when you
              register, keeping your login details private, updating your
              account information as needed, and logging out on shared
              devices. You're accountable for everything done under your
              account.
            </Text>

            <Text style={termsStyles.sectionTitle}>4. Acceptable Use</Text>
            <Text style={termsStyles.paragraph}>
              You agree not to share your account with others, upload
              harmful software or files, misuse or cheat with AI-generated
              responses, upload copyrighted material without permission,
              harass or abuse other users, attempt unauthorized access, or
              exploit bugs and vulnerabilities. Breaking these rules can
              lead to suspension or termination of your account.
            </Text>

            <Text style={termsStyles.sectionTitle}>5. AI Assistant Disclaimer</Text>
            <Text style={termsStyles.paragraph}>
              The AI Assistant offers educational guidance generated by
              artificial intelligence. Its responses may sometimes be
              incomplete or inaccurate, are not a substitute for instructor
              guidance, and students remain responsible for checking
              AI-generated answers before submitting academic work.
            </Text>

            <Text style={termsStyles.sectionTitle}>6. Intellectual Property</Text>
            <Text style={termsStyles.paragraph}>
              The application's features, source code, branding, Module
              Lessons and other materials created by the development team,
              and overall system content belong to the ParseIT Hub
              developers unless stated otherwise. You keep ownership of the
              content you upload, but you allow ParseIT Hub to store and
              process it to provide educational services.
            </Text>

            <Text style={termsStyles.sectionTitle}>7. Your Content</Text>
            <Text style={termsStyles.paragraph}>
              You're responsible for everything you upload — assignments,
              images, documents, videos, messages, and community posts. This
              content must not break any laws, infringe on copyright,
              contain malware, or include offensive material.
            </Text>

            <Text style={termsStyles.sectionTitle}>8. Service Availability</Text>
            <Text style={termsStyles.paragraph}>
              We aim to keep the platform running smoothly, but continuous
              availability isn't guaranteed. Brief interruptions may happen
              due to maintenance, updates, connectivity issues, or technical
              failures.
            </Text>

            <Text style={termsStyles.sectionTitle}>9. Suspension of Accounts</Text>
            <Text style={termsStyles.paragraph}>
              Administrators may suspend or terminate accounts that violate
              these terms, misuse system resources, attempt unauthorized
              access, or disrupt other users.
            </Text>

            <Text style={termsStyles.sectionTitle}>10. Limitation of Liability</Text>
            <Text style={termsStyles.paragraph}>
              ParseIT Hub isn't liable for data loss from user negligence,
              connectivity problems, device incompatibility, AI inaccuracies,
              or temporary service interruptions.
            </Text>

            <Text style={termsStyles.groupTitle}>Privacy Policy</Text>

            <Text style={termsStyles.sectionTitle}>1. Our Commitment</Text>
            <Text style={termsStyles.paragraph}>
              ParseIT Hub protects your personal information in line with
              the Data Privacy Act of 2012 (Republic Act No. 10173), and
              this policy explains how your data is collected, used, stored,
              and safeguarded.
            </Text>

            <Text style={termsStyles.sectionTitle}>2. Information We Collect</Text>
            <Text style={termsStyles.paragraph}>
              Depending on your role, we may collect personal details (name,
              student or employee ID, email, birthdate, photo, role),
              academic information (enrolled classes, Module Lessons
              progress, assignment submissions, quiz results, grades,
              performance analytics), system information (device, login
              activity, IP address, app version, crash and usage logs), and
              AI interaction data such as prompts and questions you submit
              to the AI Assistant.
            </Text>

            <Text style={termsStyles.sectionTitle}>3. How We Use It</Text>
            <Text style={termsStyles.paragraph}>
              Your information helps us authenticate accounts, deliver
              Module Lessons and other educational services, manage classes
              and assignments, generate academic analytics, personalize AI
              tutoring, monitor progress, improve performance, and maintain
              platform security.
            </Text>

            <Text style={termsStyles.sectionTitle}>4. Storage and Security</Text>
            <Text style={termsStyles.paragraph}>
              Your data is stored securely using Firebase cloud services and
              protected with role-based access controls, encrypted HTTPS
              communication, secure authentication, and session management.
            </Text>

            <Text style={termsStyles.sectionTitle}>5. Data Sharing</Text>
            <Text style={termsStyles.paragraph}>
              ParseIT Hub does not sell your personal information. It's only
              shared with authorized teachers and administrators, when
              required by law, or when necessary to operate the platform's
              services.
            </Text>

            <Text style={termsStyles.sectionTitle}>6. Your Rights</Text>
            <Text style={termsStyles.paragraph}>
              You may access your personal information, request corrections,
              request deletion of eligible data (subject to institutional
              policy), request a copy of your data where applicable, and
              report privacy concerns.
            </Text>

            <Text style={termsStyles.sectionTitle}>7. Changes to This Policy</Text>
            <Text style={termsStyles.paragraph}>
              This policy may be updated from time to time. You'll be
              notified of significant changes through the application, and
              continued use after changes are made means you accept the
              updated terms.
            </Text>

            <Text style={termsStyles.sectionTitle}>8. Contact</Text>
            <Text style={termsStyles.paragraph}>
              Questions about these Terms or this Privacy Policy can be
              directed to the ParseIT Hub administrators or the BSIT
              Department of Cebu Technological University – Argao Campus.
            </Text>
          </ScrollView>

          <View style={termsStyles.footer}>
            <TouchableOpacity
              style={termsStyles.primaryButton}
              activeOpacity={0.85}
              onPress={onClose}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={termsStyles.primaryButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const termsStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(43, 17, 17, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#F3D4D4',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F8E3E3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    paddingRight: 16,
  },
  headerTextWrap: {
    flex: 1,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2B1111',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#8A6F6F',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9E7B7B',
    marginBottom: 4,
  },
  groupTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 18,
    marginBottom: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8E3E3',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    marginTop: 14,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    color: '#4B5563',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: '#F8E3E3',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  primaryButton: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 8,
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

  const [showTermsModal, setShowTermsModal] = useState(false);

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
                  onPress={() => setShowTermsModal(true)}
                >
                  Terms and Privacy Policy
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

      {/* Terms and Privacy Policy modal */}
      <TermsPrivacyModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
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