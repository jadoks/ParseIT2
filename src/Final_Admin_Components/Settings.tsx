import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useRef, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type SettingsProps = {
  width: number;
};

type PinInputProps = {
  value: string[];
  onChange: (index: number, text: string) => void;
  isMobile: boolean;
};

function PinInput({ value, onChange, isMobile }: PinInputProps) {
  const refs = useRef<Array<TextInput | null>>([]);

  return (
    <View style={[styles.pinRow, isMobile && styles.pinRowMobile]}>
      {value.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            refs.current[index] = ref;
          }}
          value={digit}
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
          style={[styles.pinBox, isMobile && styles.pinBoxMobile]}
          textAlign="center"
        />
      ))}
    </View>
  );
}

export default function Settings({ width }: SettingsProps) {
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;

  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(true);
  const [isChangeEmailModalVisible, setIsChangeEmailModalVisible] =
    useState(false);
  const [isChangePasswordModalVisible, setIsChangePasswordModalVisible] =
    useState(false);

  const [changeEmailStep, setChangeEmailStep] = useState(1);
  const [changePasswordStep, setChangePasswordStep] = useState(1);

  const [changeEmailPin, setChangeEmailPin] = useState(["", "", "", ""]);
  const [newEmail, setNewEmail] = useState("");

  const [passwordEmail, setPasswordEmail] = useState("");
  const [changePasswordPin, setChangePasswordPin] = useState(["", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetChangeEmailModal = () => {
    setChangeEmailStep(1);
    setChangeEmailPin(["", "", "", ""]);
    setNewEmail("");
    setIsChangeEmailModalVisible(false);
  };

  const resetChangePasswordModal = () => {
    setChangePasswordStep(1);
    setPasswordEmail("");
    setChangePasswordPin(["", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
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

  const settingsCardWidth = isMobile ? "100%" : isTablet ? "88%" : "72%";
  const childModalWidth = isMobile ? "100%" : isTablet ? "82%" : "58%";

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
                onPress={() => setIsSettingsModalVisible(false)}
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
                  onPress={() => setIsChangeEmailModalVisible(true)}
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
                onPress={() => setIsSettingsModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSecondaryButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                    Enter the 4-digit PIN code sent to your existing email.
                  </Text>

                  <PinInput
                    value={changeEmailPin}
                    onChange={handleChangeEmailPinChange}
                    isMobile={isMobile}
                  />
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
                  onPress={() => setChangeEmailStep(1)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalSecondaryButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              {changeEmailStep === 1 ? (
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    isMobile && styles.modalButtonMobile,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setChangeEmailStep(2)}
                >
                  <Ionicons
                    name="arrow-forward-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.modalPrimaryButtonText}>Next</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    isMobile && styles.modalButtonMobile,
                  ]}
                  activeOpacity={0.85}
                  onPress={resetChangeEmailModal}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.modalPrimaryButtonText}>Save</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

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
                    Enter the 4-digit PIN code sent to the email.
                  </Text>

                  <PinInput
                    value={changePasswordPin}
                    onChange={handleChangePasswordPinChange}
                    isMobile={isMobile}
                  />
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
                      secureTextEntry
                    />
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
                      secureTextEntry
                    />
                  </View>
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
                  onPress={() =>
                    setChangePasswordStep((prev) => Math.max(1, prev - 1))
                  }
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalSecondaryButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              {changePasswordStep < 3 ? (
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    isMobile && styles.modalButtonMobile,
                  ]}
                  activeOpacity={0.85}
                  onPress={() =>
                    setChangePasswordStep((prev) => Math.min(3, prev + 1))
                  }
                >
                  <Ionicons
                    name="arrow-forward-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.modalPrimaryButtonText}>Next</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    isMobile && styles.modalButtonMobile,
                  ]}
                  activeOpacity={0.85}
                  onPress={resetChangePasswordModal}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.modalPrimaryButtonText}>Save</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
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
    padding: 20,
  },

  modalCard: {
    maxWidth: 980,
    maxHeight: "92%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    overflow: "hidden",
  },

  modalCardSmall: {
    maxWidth: 760,
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

  actionCard: {
    minHeight: 72,
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

  textInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#2B1111",
    fontWeight: "600",
  },

  pinRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    marginTop: 8,
  },

  pinRowMobile: {
    gap: 10,
  },

  pinBox: {
    width: 72,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFF9F9",
    fontSize: 22,
    fontWeight: "800",
    color: "#2B1111",
  },

  pinBoxMobile: {
    width: 56,
    height: 56,
    fontSize: 20,
    borderRadius: 14,
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