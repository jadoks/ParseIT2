import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useState } from "react";
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

type TriggerItem = {
  id: string;
  value: string;
};

type ChatbotModalProps = {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
};

export default function Chatbot({
  visible,
  onClose,
  isMobile,
}: ChatbotModalProps) {
  const [chatbotResponse, setChatbotResponse] = useState("");
  const [triggerInput, setTriggerInput] = useState("");
  const [triggers, setTriggers] = useState<TriggerItem[]>([]);

  const handleClose = () => onClose();

  const handleAddTrigger = () => {
    const cleanedValue = triggerInput.trim();

    if (!cleanedValue) return;

    setTriggers((prev) => [
      ...prev,
      {
        id: `${cleanedValue}-${Date.now()}`,
        value: cleanedValue,
      },
    ]);
    setTriggerInput("");
  };

  const handleRemoveTrigger = (id: string) => {
    setTriggers((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddData = () => {
    console.log("Chatbot Response:", chatbotResponse);
    console.log(
      "Trigger Inputs:",
      triggers.map((item) => item.value)
    );
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalIconBox}>
                <MaterialCommunityIcons
                  name="robot-outline"
                  size={22}
                  color="#DC2626"
                />
              </View>

              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.modalTitle}>Train Chatbot</Text>
                <Text style={styles.modalSubtitle}>
                  Add chatbot response data and trigger phrases for training.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={handleClose}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={20} color="#7A4A4A" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
          >
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeaderRow}>
                <MaterialCommunityIcons
                  name="message-text-outline"
                  size={18}
                  color="#DC2626"
                />
                <Text style={styles.modalSectionTitle}>Training Details</Text>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Chatbot Response</Text>
                <View style={[styles.inputField, styles.textAreaField]}>
                  <TextInput
                    value={chatbotResponse}
                    onChangeText={setChatbotResponse}
                    placeholder="Enter chatbot response"
                    placeholderTextColor="#B79A9A"
                    style={styles.textAreaInput}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Trigger Input</Text>
                <View style={[styles.modalRow, isMobile && styles.modalRowStack]}>
                  <View style={styles.triggerInputWrap}>
                    <View style={styles.inputField}>
                      <Ionicons
                        name="flash-outline"
                        size={18}
                        color="#8A6F6F"
                      />
                      <TextInput
                        value={triggerInput}
                        onChangeText={setTriggerInput}
                        placeholder="Enter trigger input"
                        placeholderTextColor="#B79A9A"
                        style={styles.textInput}
                        onSubmitEditing={handleAddTrigger}
                        returnKeyType="done"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.addTriggerButton}
                    activeOpacity={0.85}
                    onPress={handleAddTrigger}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.addTriggerButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {triggers.length > 0 && (
                <View style={styles.tagsWrap}>
                  {triggers.map((item) => (
                    <View key={item.id} style={styles.tagChip}>
                      <Text style={styles.tagText}>{item.value}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveTrigger(item.id)}
                        activeOpacity={0.85}
                        style={styles.tagRemoveButton}
                      >
                        <Ionicons name="close" size={14} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={handleClose}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              activeOpacity={0.85}
              onPress={handleAddData}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.modalPrimaryButtonText}>Add Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    width: "100%",
    maxWidth: 920,
    maxHeight: "92%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    overflow: "hidden",
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

  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 4,
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

  fieldBlock: {
    marginBottom: 18,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5F3B3B",
    marginBottom: 10,
  },

  modalRow: {
    flexDirection: "row",
    gap: 14,
    zIndex: 20,
  },

  modalRowStack: {
    flexDirection: "column",
  },

  triggerInputWrap: {
    flex: 1,
  },

  inputField: {
    minHeight: 54,
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

  textAreaField: {
    minHeight: 130,
    alignItems: "flex-start",
    paddingVertical: 14,
  },

  textAreaInput: {
    flex: 1,
    width: "100%",
    fontSize: 14,
    color: "#2B1111",
    fontWeight: "600",
  },

  addTriggerButton: {
    height: 54,
    minWidth: 110,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  addTriggerButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 8,
  },

  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },

  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#F3D4D4",
    borderRadius: 999,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },

  tagText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7A4A4A",
    marginRight: 8,
  },

  tagRemoveButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: "#F8E3E3",
    flexDirection: "row",
    justifyContent: "flex-end",
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
  },

  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 8,
  },
});
