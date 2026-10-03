import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useState } from "react";
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

import { Fetcher, SectionConfig, YEAR_IDS } from "./programHelpers";

const YEAR_LABELS: Record<string, string> = {
  "1st": "1st Year",
  "2nd": "2nd Year",
  "3rd": "3rd Year",
  "4th": "4th Year",
};

// Editing model: id is fixed (e.g. "1B"); admin edits only the name part.
type Row = { id: string; name: string };
type Draft = Record<string, Row[]>;

const toDraft = (config: SectionConfig): Draft =>
  Object.fromEntries(
    YEAR_IDS.map((yearId) => [
      yearId,
      (config[yearId] || []).map((s) => ({
        id: s.id,
        name: s.label.slice(s.id.length).trim(),
      })),
    ])
  );

const nextSectionId = (yearId: string, rows: Row[]) => {
  const digit = String(YEAR_IDS.indexOf(yearId) + 1);
  for (let code = 65; code <= 90; code++) {
    const id = `${digit}${String.fromCharCode(code)}`;
    if (!rows.some((r) => r.id === id)) return id;
  }
  return null;
};

export default function ManageSectionsModal({
  visible,
  onClose,
  config,
  fetcher,
  onSaved,
  showToast,
}: {
  visible: boolean;
  onClose: () => void;
  config: SectionConfig;
  fetcher: Fetcher;
  onSaved: () => void | Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(config));
  const [yearId, setYearId] = useState("1st");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setDraft(toDraft(config));
      setError("");
    }
  }, [visible, config]);

  const rows = draft[yearId] || [];
  const setRows = (next: Row[]) => setDraft((prev) => ({ ...prev, [yearId]: next }));

  const addSection = () => {
    const id = nextSectionId(yearId, rows);
    if (!id) {
      setError("This year already has 26 sections.");
      return;
    }
    setError("");
    setRows([...rows, { id, name: "" }]);
  };

  const save = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const years = Object.fromEntries(
        YEAR_IDS.map((y) => [
          y,
          (draft[y] || []).map((r) => ({ id: r.id, label: `${r.id} ${r.name.trim()}`.trim() })),
        ])
      );
      const response = await fetcher("/section-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ years }),
      });
      const body = await response.json();
      // Shown inside the modal – a Toast would render underneath this <Modal>.
      if (!response.ok) throw new Error(body?.error || "Failed to save sections.");
      await onSaved();
      const renamed = body?.data?.renamedClasses || 0;
      showToast(
        renamed > 0 ? `Sections saved. ${renamed} existing class${renamed > 1 ? "es" : ""} updated.` : "Sections saved.",
        "success"
      );
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to save sections.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !isSaving && onClose()}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => !isSaving && onClose()} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Manage Sections</Text>
              <Text style={styles.subtitle}>
                Add, rename, or delete sections per year level. Renaming also updates classes that already use it.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isSaving} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#7A4A4A" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabRow}>
            {YEAR_IDS.map((y) => (
              <TouchableOpacity key={y} style={[styles.tab, yearId === y && styles.tabActive]} onPress={() => setYearId(y)}>
                <Text style={[styles.tabText, yearId === y && styles.tabTextActive]}>{YEAR_LABELS[y]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ padding: 20 }}>
            {rows.length === 0 && <Text style={styles.empty}>No sections yet for this year.</Text>}
            {rows.map((row) => (
              <View key={row.id} style={styles.row}>
                <View style={styles.idBadge}>
                  <Text style={styles.idBadgeText}>{row.id}</Text>
                </View>
                <TextInput
                  value={row.name}
                  onChangeText={(text) => setRows(rows.map((r) => (r.id === row.id ? { ...r, name: text } : r)))}
                  placeholder="Section name (e.g., Google)"
                  placeholderTextColor="#B79A9A"
                  maxLength={30}
                  style={styles.input}
                />
                <TouchableOpacity onPress={() => setRows(rows.filter((r) => r.id !== row.id))} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addBtn} onPress={addSection}>
              <Ionicons name="add-circle-outline" size={18} color="#8B0000" />
              <Text style={styles.addBtnText}>Add section</Text>
            </TouchableOpacity>
          </ScrollView>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSaving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, isSaving && { opacity: 0.75 }]} onPress={save} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="save-outline" size={18} color="#FFFFFF" />}
              <Text style={styles.saveText}>{isSaving ? "Saving..." : "Save Sections"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(43,17,17,0.45)", justifyContent: "center", alignItems: "center", padding: 20 },
  card: {
    width: "100%",
    maxWidth: 640,
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#EBD4D4",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    padding: 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3E6E6",
    alignItems: "flex-start",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#2B1111", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#8A6F6F", lineHeight: 19 },
  closeBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#FAF5F5", alignItems: "center", justifyContent: "center" },
  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingTop: 14, flexWrap: "wrap" },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: "#E8CCCC", backgroundColor: "#FFFFFF" },
  tabActive: { backgroundColor: "#8B0000", borderColor: "#8B0000" },
  tabText: { fontSize: 13, fontWeight: "700", color: "#7A4A4A" },
  tabTextActive: { color: "#FFFFFF" },
  body: { flexGrow: 0 },
  empty: { color: "#8A6F6F", fontSize: 13, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  idBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#F1E0E0", alignItems: "center", justifyContent: "center" },
  idBadgeText: { fontWeight: "800", color: "#8B0000" },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8CCCC",
    backgroundColor: "#FAF5F5",
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "600",
    color: "#2B1111",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  deleteBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  addBtn: {
    minHeight: 44,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#8B0000",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  addBtnText: { color: "#8B0000", fontWeight: "700", fontSize: 13 },
  error: { color: "#DC2626", fontSize: 13, fontWeight: "600", paddingHorizontal: 22, paddingBottom: 8 },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3E6E6",
  },
  cancelBtn: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2BFBF",
    backgroundColor: "#FAF5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: "#7A4A4A" },
  saveBtn: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#8B0000",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
});