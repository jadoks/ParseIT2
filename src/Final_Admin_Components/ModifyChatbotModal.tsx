import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

type ModifyChatbotModalProps = {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
};

type TrainingFile = {
  name?: string;
  url?: string;
  storagePath?: string;
  mimeType?: string;
  bucketPath?: string;
  size?: number;
};

type ChatbotTrainingItem = {
  id: string;
  response: string;
  triggers: string[];
  file: TrainingFile | null;
  source?: string | null;
  createdAt?: any;
  updatedAt?: any;
};

function getApiBaseUrl() {
  if (Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    "";

  const host = possibleHost.split(":")[0];

  return host
    ? `http://${host}:5000`
    : "http://192.168.1.5:5000";
}

const API_BASE_URL = getApiBaseUrl();

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, {
    credentials: "include",
    ...options,
  });

function formatDate(value: any) {
  if (!value) return "Unknown date";
  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleString();
}

const fileUriToBase64 = async (uri: string): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to convert file to base64."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read selected file."));
    reader.readAsDataURL(blob);
  });
};

export default function ModifyChatbotModal({
  visible,
  onClose,
  isMobile,
}: ModifyChatbotModalProps) {
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replacingFileId, setReplacingFileId] = useState<string | null>(null);
  const [removingFileId, setRemovingFileId] = useState<string | null>(null);
  const [items, setItems] = useState<ChatbotTrainingItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedResponse, setEditedResponse] = useState("");
  const [editedTriggers, setEditedTriggers] = useState<string[]>([]);
  const [newTriggerText, setNewTriggerText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<ChatbotTrainingItem | null>(null);

  // Focus tracking so these fields get the same highlighted-border
  // behavior as inputs elsewhere in the app (matches Chatbot.tsx) instead
  // of always looking static.
  const [isEditResponseFocused, setIsEditResponseFocused] = useState(false);
  const [isNewTriggerFocused, setIsNewTriggerFocused] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return items;

    return items.filter((item) => {
      const inResponse = (item.response || "").toLowerCase().includes(keyword);
      const inTriggers = (item.triggers || []).some((trigger) =>
        trigger.toLowerCase().includes(keyword)
      );
      const inFileName = (item.file?.name || "").toLowerCase().includes(keyword);
      return inResponse || inTriggers || inFileName;
    });
  }, [items, searchText]);

  const loadTrainingItems = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`${API_BASE_URL}/chatbot-training`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load training data.");
      }

      setItems(Array.isArray(data?.data) ? data.data : []);
    } catch (error: any) {
      console.error("Failed to load chatbot training:", error);
      Alert.alert("Error", error?.message || "Failed to load training data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    loadTrainingItems();
  }, [visible]);

  const resetEditState = () => {
    setEditingId(null);
    setEditedResponse("");
    setEditedTriggers([]);
    setNewTriggerText("");
  };

  const handleStartEdit = (item: ChatbotTrainingItem) => {
    setEditingId(item.id);
    setEditedResponse(item.response || "");
    setEditedTriggers(Array.isArray(item.triggers) ? item.triggers : []);
    setNewTriggerText("");
  };

  const handleCancelEdit = () => {
    resetEditState();
  };

  const handleAddTrigger = () => {
    const cleaned = newTriggerText.trim();
    if (!cleaned) {
      Alert.alert("Required", "Please enter a trigger.");
      return;
    }

    const alreadyExists = editedTriggers.some(
      (trigger) => trigger.toLowerCase() === cleaned.toLowerCase()
    );

    if (alreadyExists) {
      Alert.alert("Duplicate", "That trigger already exists.");
      return;
    }

    setEditedTriggers((prev) => [...prev, cleaned]);
    setNewTriggerText("");
  };

  const handleRemoveTrigger = (triggerToRemove: string) => {
    setEditedTriggers((prev) =>
      prev.filter((trigger) => trigger !== triggerToRemove)
    );
  };

  const handleSaveEdit = async (item: ChatbotTrainingItem) => {
    const cleanedResponse = editedResponse.trim();
    const cleanedTriggers = editedTriggers.map((entry) => entry.trim()).filter(Boolean);

    if (!cleanedResponse) {
      Alert.alert("Required", "Response cannot be empty.");
      return;
    }

    if (cleanedTriggers.length === 0) {
      Alert.alert("Required", "Please add at least one trigger.");
      return;
    }

    try {
      setSavingId(item.id);

      const response = await apiFetch(`${API_BASE_URL}/chatbot-training/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response: cleanedResponse,
          triggers: cleanedTriggers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update training data.");
      }

      setItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                ...(data?.data || {}),
                id: item.id,
              }
            : entry
        )
      );

      Alert.alert("Success", "Training data updated successfully.");
      resetEditState();
    } catch (error: any) {
      console.error("Failed to update chatbot training: ", error);
      Alert.alert("Error", error?.message || "Failed to update training data.");
    } finally {
      setSavingId(null);
    }
  };

  const handleReplaceFile = async (item: ChatbotTrainingItem) => {
    try {
      setReplacingFileId(item.id);
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: "*/*",
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const file = result.assets[0];
      const fileBase64 = await fileUriToBase64(file.uri);

      const response = await apiFetch(`${API_BASE_URL}/chatbot-training/${item.id}/file`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileBase64,
          fileName: file.name,
          fileType: file.mimeType || "application/octet-stream",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to replace training file.");
      }

      setItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                ...(data?.data || {}),
                id: item.id,
              }
            : entry
        )
      );

      Alert.alert("Success", "Training file replaced successfully.");
    } catch (error: any) {
      console.error("Failed to replace training file: ", error);
      Alert.alert("Error", error?.message || "Failed to replace training file.");
    } finally {
      setReplacingFileId(null);
    }
  };

  const handleRemoveFile = async (item: ChatbotTrainingItem) => {
    try {
      setRemovingFileId(item.id);
      const response = await apiFetch(`${API_BASE_URL}/chatbot-training/${item.id}/file`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to remove training file.");
      }

      setItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                ...(data?.data || {}),
                id: item.id,
              }
            : entry
        )
      );

      Alert.alert("Success", "Training file removed successfully.");
    } catch (error: any) {
      console.error("Failed to remove training file: ", error);
      Alert.alert("Error", error?.message || "Failed to remove training file.");
    } finally {
      setRemovingFileId(null);
    }
  };

  const handleDelete = (item: ChatbotTrainingItem) => {
    setConfirmDeleteItem(item);
  };

  const handleCancelDelete = () => {
    if (deletingId) return;
    setConfirmDeleteItem(null);
  };

  const performDelete = async () => {
    if (!confirmDeleteItem) return;
    try {
      setDeletingId(confirmDeleteItem.id);

      const response = await apiFetch(`${API_BASE_URL}/chatbot-training/${confirmDeleteItem.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Delete failed.");
      }

      setItems((prev) => prev.filter((entry) => entry.id !== confirmDeleteItem.id));
      setConfirmDeleteItem(null);
      Alert.alert("Success", "Training data deleted successfully.");
    } catch (error: any) {
      console.error("Delete error: ", error);
      Alert.alert("Error", error?.message || "Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBox}>
                  <MaterialCommunityIcons name="robot-happy-outline" size={22} color="#DC2626" />
                </View>
                <View style={styles.modalHeaderTextWrap}>
                  <Text style={styles.modalTitle}>Modify Chatbot</Text>
                  <Text style={styles.modalSubtitle}>
                    Search, edit, replace files, and delete chatbot training data.
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={onClose} activeOpacity={0.85}>
                <Ionicons name="close" size={20} color="#7A4A4A" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrap}>
              <View
                style={[
                  styles.searchField,
                  isSearchFocused && styles.inputFieldFocused,
                ]}
              >
                <Ionicons name="search-outline" size={18} color="#8A6F6F" />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search by response, trigger, or file name"
                  placeholderTextColor="#B79A9A"
                  style={styles.searchInput}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                />
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              {loading ? (
                <View style={styles.centerState}>
                  <ActivityIndicator size="large" color="#DC2626" />
                  <Text style={styles.centerStateText}>Loading training data...</Text>
                </View>
              ) : filteredItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="database-search-outline" size={34} color="#DC2626" />
                  <Text style={styles.emptyStateTitle}>No matching training data</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Try a different search or add new chatbot training entries.
                  </Text>
                </View>
              ) : (
                filteredItems.map((item) => {
                  const isEditing = editingId === item.id;
                  const isSaving = savingId === item.id;
                  const isDeleting = deletingId === item.id;
                  const isReplacing = replacingFileId === item.id;
                  const isRemovingFile = removingFileId === item.id;

                  return (
                    <View key={item.id} style={styles.trainingCard}>
                      <View style={styles.trainingCardHeader}>
                        <View style={styles.trainingCardHeaderLeft}>
                          <Text style={styles.trainingCardTitle}>Training Entry</Text>
                          {item.source === "admin-panel-auto-split" && (
                            <Text style={styles.autoSplitBadge}>Auto-split from File</Text>
                          )}
                          <Text style={styles.trainingCardMeta}>Created: {formatDate(item.createdAt)}</Text>
                          <Text style={styles.trainingCardMeta}>
                            Updated: {formatDate(item.updatedAt || item.createdAt)}
                          </Text>
                        </View>
                        {!isEditing && (
                          <View style={styles.trainingActions}>
                            <TouchableOpacity
                              style={styles.editButton}
                              activeOpacity={0.85}
                              onPress={() => handleStartEdit(item)}
                            >
                              <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                              <Text style={styles.actionButtonText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.deleteButton, isDeleting && styles.disabledButton]}
                              activeOpacity={0.85}
                              onPress={() => handleDelete(item)}
                              disabled={isDeleting}
                            >
                              <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                              <Text style={styles.actionButtonText}>
                                {isDeleting ? "Deleting..." : "Delete"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      <View style={styles.fieldBlock}>
                        <Text style={styles.fieldLabel}>Response</Text>
                        {isEditing ? (
                          <View
                            style={[
                              styles.inputField,
                              styles.textAreaField,
                              isEditResponseFocused && styles.inputFieldFocused,
                            ]}
                          >
                            <TextInput
                              value={editedResponse}
                              onChangeText={setEditedResponse}
                              placeholder="Enter chatbot response"
                              placeholderTextColor="#B79A9A"
                              style={styles.textAreaInput}
                              multiline
                              textAlignVertical="top"
                              onFocus={() => setIsEditResponseFocused(true)}
                              onBlur={() => setIsEditResponseFocused(false)}
                            />
                          </View>
                        ) : (
                          <View style={styles.previewBox}>
                            <Text style={styles.previewText}>{item.response}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.fieldBlock}>
                        <Text style={styles.fieldLabel}>Triggers</Text>
                        {isEditing ? (
                          <>
                            <View style={styles.tagsWrap}>
                              {editedTriggers.map((trigger, index) => (
                                <View key={`${item.id}-edit-${trigger}-${index}`} style={styles.editableTagChip}>
                                  <Text style={styles.tagText}>{trigger}</Text>
                                  <TouchableOpacity
                                    onPress={() => handleRemoveTrigger(trigger)}
                                    style={styles.removeTriggerButton}
                                    activeOpacity={0.8}
                                  >
                                    <Ionicons name="close" size={14} color="#7A4A4A" />
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </View>
                            <View style={[styles.addTriggerRow, isMobile && styles.addTriggerRowStack]}>
                              <View
                                style={[
                                  styles.inputField,
                                  styles.addTriggerInputWrap,
                                  isMobile && styles.addTriggerInputWrapStack,
                                  isNewTriggerFocused && styles.inputFieldFocused,
                                ]}
                              >
                                <TextInput
                                  value={newTriggerText}
                                  onChangeText={setNewTriggerText}
                                  placeholder="Add a trigger"
                                  placeholderTextColor="#B79A9A"
                                  style={styles.textInput}
                                  onSubmitEditing={handleAddTrigger}
                                  returnKeyType="done"
                                  onFocus={() => setIsNewTriggerFocused(true)}
                                  onBlur={() => setIsNewTriggerFocused(false)}
                                />
                              </View>
                              <TouchableOpacity style={styles.addTriggerButton} activeOpacity={0.85} onPress={handleAddTrigger}>
                                <Ionicons name="add" size={18} color="#FFFFFF" />
                                <Text style={styles.actionButtonText}>Add</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        ) : (
                          <View style={styles.tagsWrap}>
                            {item.triggers.map((trigger, index) => (
                              <View key={`${item.id}-${trigger}-${index}`} style={styles.tagChip}>
                                <Text style={styles.tagText}>{trigger}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>

                      <View style={styles.fieldBlock}>
                        <Text style={styles.fieldLabel}>Attached File</Text>
                        {item.file ? (
                          <View style={styles.previewBox}>
                            <Text style={styles.previewText}>{item.file.name || "Unnamed file"}</Text>
                            <Text style={styles.previewSubText}>{item.file.mimeType || "Unknown type"}</Text>
                            <View style={[styles.fileActionRow, isMobile && styles.fileActionRowStack]}>
                              <TouchableOpacity
                                style={styles.replaceFileButton}
                                activeOpacity={0.85}
                                onPress={() => handleReplaceFile(item)}
                                disabled={isReplacing || isSaving}
                              >
                                <Ionicons name="swap-horizontal-outline" size={16} color="#FFFFFF" />
                                <Text style={styles.actionButtonText}>
                                  {isReplacing ? "Replacing..." : "Replace File"}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.removeFileButton}
                                activeOpacity={0.85}
                                onPress={() => handleRemoveFile(item)}
                                disabled={isRemovingFile || isSaving}
                              >
                                <Ionicons name="close-circle-outline" size={16} color="#FFFFFF" />
                                <Text style={styles.actionButtonText}>
                                  {isRemovingFile ? "Removing..." : "Remove File"}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.previewBox}>
                            <Text style={styles.previewSubText}>No file attached.</Text>
                            <View style={styles.fileActionRow}>
                              <TouchableOpacity
                                style={styles.replaceFileButton}
                                activeOpacity={0.85}
                                onPress={() => handleReplaceFile(item)}
                                disabled={isReplacing || isSaving}
                              >
                                <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
                                <Text style={styles.actionButtonText}>
                                  {isReplacing ? "Uploading..." : "Upload File"}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>

                      {isEditing && (
                        <View style={[styles.editFooter, isMobile && styles.editFooterStack]}>
                          <TouchableOpacity
                            style={[styles.modalSecondaryButton, isMobile && styles.modalSecondaryButtonStack]}
                            activeOpacity={0.85}
                            onPress={handleCancelEdit}
                            disabled={isSaving}
                          >
                            <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.modalPrimaryButton}
                            activeOpacity={0.85}
                            onPress={() => handleSaveEdit(item)}
                            disabled={isSaving}
                          >
                            <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.modalPrimaryButtonText}>
                              {isSaving ? "Saving..." : "Save Changes"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!confirmDeleteItem} animationType="fade" transparent onRequestClose={handleCancelDelete}>
        <View style={styles.confirmOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCancelDelete} />
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconBox}>
              <Ionicons name="trash-outline" size={24} color="#DC2626" />
            </View>
            <Text style={styles.confirmTitle}>Delete Training Entry?</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete this chatbot training data? This action cannot be undone.
            </Text>
            {confirmDeleteItem?.response ? (
              <View style={styles.confirmPreviewBox}>
                <Text style={styles.confirmPreviewLabel}>Response Preview</Text>
                <Text style={styles.confirmPreviewText} numberOfLines={3}>
                  {confirmDeleteItem.response}
                </Text>
              </View>
            ) : null}
            <View style={[styles.confirmActions, isMobile && styles.confirmActionsStack]}>
              <TouchableOpacity
                style={[styles.confirmCancelButton, isMobile && styles.confirmCancelButtonStack]}
                activeOpacity={0.85}
                onPress={handleCancelDelete}
                disabled={!!deletingId}
              >
                <Text style={styles.confirmCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteButton, deletingId && styles.disabledButton]}
                activeOpacity={0.85}
                onPress={performDelete}
                disabled={!!deletingId}
              >
                <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                <Text style={styles.confirmDeleteButtonText}>
                  {deletingId ? "Deleting..." : "Yes, Delete"}
                </Text>
              </TouchableOpacity>
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
    width: "100%",
    maxWidth: 980,
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
  searchWrap: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 0,
  },
  searchField: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFF9F9",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#2B1111",
    fontWeight: "600",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  modalContent: {
    padding: 24,
    paddingBottom: 18,
  },
  centerState: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  centerStateText: {
    marginTop: 12,
    fontSize: 14,
    color: "#7A4A4A",
    fontWeight: "600",
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: "#2B1111",
  },
  emptyStateSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#8A6F6F",
    textAlign: "center",
    maxWidth: 420,
  },
  trainingCard: {
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFFDFD",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  trainingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  trainingCardHeaderLeft: {
    flex: 1,
    paddingRight: 12,
  },
  trainingCardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 6,
  },
  trainingCardMeta: {
    fontSize: 12,
    color: "#8A6F6F",
    marginBottom: 2,
  },
  trainingActions: {
    flexDirection: "row",
  },
  editButton: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginRight: 8,
  },
  deleteButton: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#7A4A4A",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  replaceFileButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 10,
    marginRight: 8,
  },
  removeFileButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#7A4A4A",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 10,
  },
  addTriggerButton: {
    height: 54,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 6,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5F3B3B",
    marginBottom: 8,
  },
  inputField: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1CACA",
    backgroundColor: "#FFF9F9",
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  // Applied alongside inputField / searchField when the inner TextInput is
  // focused. Gives a visible highlighted border on the whole rounded
  // container, matching the focus behavior used in Chatbot.tsx.
  inputFieldFocused: {
    borderColor: "#DC2626",
    borderWidth: 1.5,
  },
  textInput: {
    fontSize: 14,
    color: "#2B1111",
    fontWeight: "600",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
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
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  previewBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFF8F8",
    padding: 14,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#2B1111",
    fontWeight: "600",
  },
  previewSubText: {
    marginTop: 6,
    fontSize: 12,
    color: "#8A6F6F",
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#F3D4D4",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  editableTagChip: {
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
  },
  removeTriggerButton: {
    marginLeft: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFE4E4",
    alignItems: "center",
    justifyContent: "center",
  },
  addTriggerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  addTriggerRowStack: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  addTriggerInputWrap: {
    flex: 1,
    marginRight: 10,
  },
  addTriggerInputWrapStack: {
    marginRight: 0,
    marginBottom: 10,
  },
  fileActionRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  fileActionRowStack: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  editFooter: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  editFooterStack: {
    flexDirection: "column",
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
  modalSecondaryButtonStack: {
    marginRight: 0,
    marginBottom: 10,
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
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(43, 17, 17, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    padding: 22,
  },
  confirmIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    alignSelf: "center",
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2B1111",
    textAlign: "center",
    marginBottom: 10,
  },
  confirmMessage: {
    fontSize: 14,
    lineHeight: 22,
    color: "#7A4A4A",
    textAlign: "center",
    marginBottom: 16,
  },
  confirmPreviewBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFF8F8",
    padding: 14,
    marginBottom: 18,
  },
  confirmPreviewLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A6F6F",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  confirmPreviewText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#2B1111",
    fontWeight: "600",
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  confirmActionsStack: {
    flexDirection: "column",
  },
  confirmCancelButton: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7C0C0",
    backgroundColor: "#FFF7F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  confirmCancelButtonStack: {
    marginRight: 0,
    marginBottom: 10,
  },
  confirmCancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7A4A4A",
  },
  confirmDeleteButton: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  confirmDeleteButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  autoSplitBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});