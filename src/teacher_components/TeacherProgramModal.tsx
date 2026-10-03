import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useProgramFile } from "../Final_Admin_Components/ProgramClassPicker";
import { Fetcher, ScheduleEntry } from "../Final_Admin_Components/programHelpers";

const to12h = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const mer = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${mer}`;
};

const formatBlock = (b: ScheduleEntry) =>
  `${b.days.join("/")} ${to12h(b.startTime)}–${to12h(b.endTime)}${b.room ? ` · ${b.room}` : ""}`;

/**
 * "Upload My Program" — opened from the teacher drawer menu.
 * Uploading only stores the parsed program. It never creates classes; the
 * subjects show up later in the Create Class modal for auto-fill.
 */
export default function TeacherProgramModal({
  visible,
  onClose,
  teacherId,
  fetcher,
  showToast,
}: {
  visible: boolean;
  onClose: () => void;
  teacherId: string;
  fetcher: Fetcher; // path-only fetcher, e.g. apiFetch from ../services/api
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}) {
  const { program, isLoading, isUploading, error, upload, remove } = useProgramFile({
    teacherId,
    fetcher,
    enabled: visible,
    showToast,
  });

  const subjectCount = program?.subjects.length || 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !isUploading && onClose()}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => !isUploading && onClose()} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Ionicons name="document-text-outline" size={22} color="#8B0000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>My Program</Text>
              <Text style={styles.subtitle}>
                Upload your Program by Teacher (image, PDF, or Word). Classes are not created automatically — your
                subjects will appear in Create Class so you can pick one to fill the form.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isUploading} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#7A4A4A" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {isLoading ? (
              <View style={styles.centerRow}>
                <ActivityIndicator size="small" color="#8B0000" />
                <Text style={styles.muted}>Loading your program…</Text>
              </View>
            ) : (
              <>
                {program && (
                  <View style={styles.fileRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {program.fileName}
                      </Text>
                      <Text style={styles.muted}>
                        {[program.semester, program.schoolYear && `A.Y. ${program.schoolYear}`]
                          .filter(Boolean)
                          .join(" · ") || "Semester not detected"}{" "}
                        · {subjectCount} subject{subjectCount === 1 ? "" : "s"}
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity style={styles.uploadBtn} onPress={upload} disabled={isUploading} activeOpacity={0.85}>
                  {isUploading ? (
                    <>
                      <ActivityIndicator size="small" color="#8B0000" />
                      <Text style={styles.uploadBtnText}>Reading your program…</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={18} color="#8B0000" />
                      <Text style={styles.uploadBtnText}>{program ? "Replace Program" : "Upload Program"}</Text>
                    </>
                  )}
                </TouchableOpacity>

                {!!error && <Text style={styles.error}>{error}</Text>}

                {program?.subjects.map((subject) => (
                  <View key={subject.key} style={styles.subjectCard}>
                    <Text style={styles.subjectTitle}>{subject.title}</Text>
                    <Text style={styles.muted}>
                      {[subject.courseCode, subject.units ? `${subject.units} unit${subject.units === 1 ? "" : "s"}` : ""]
                        .filter(Boolean)
                        .join(" · ") || "Subject"}
                    </Text>
                    {subject.sections.map((section) => (
                      <View key={section.id} style={styles.sectionRow}>
                        <Text style={styles.sectionId}>{section.id === "?" ? "—" : section.id}</Text>
                        <View style={{ flex: 1 }}>
                          {section.id === "?" && <Text style={styles.muted}>No section shown on the program</Text>}
                          {section.schedule.length === 0 ? (
                            <Text style={styles.muted}>No schedule detected</Text>
                          ) : (
                            section.schedule.map((b, i) => (
                              <Text key={i} style={styles.scheduleText}>
                                {formatBlock(b)}
                              </Text>
                            ))
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}

                {program && (
                  <TouchableOpacity style={styles.removeBtn} onPress={remove} disabled={isUploading}>
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                    <Text style={styles.removeText}>Remove program</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
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
    maxHeight: "92%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#EBD4D4",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3E6E6",
  },
  iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#F1E0E0", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: "#2B1111", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#8A6F6F", lineHeight: 19 },
  closeBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#FAF5F5", alignItems: "center", justifyContent: "center" },
  body: { padding: 22 },
  centerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  muted: { fontSize: 13, color: "#8A6F6F", lineHeight: 19 },
  fileRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  fileName: { fontSize: 14, fontWeight: "700", color: "#2B1111" },
  uploadBtn: {
    minHeight: 50,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#8B0000",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  uploadBtnText: { color: "#8B0000", fontWeight: "700", fontSize: 14 },
  error: { color: "#DC2626", fontSize: 13, fontWeight: "600", marginBottom: 14 },
  subjectCard: { borderWidth: 1, borderColor: "#EBD4D4", borderRadius: 14, backgroundColor: "#FFFBFB", padding: 14, marginBottom: 10 },
  subjectTitle: { fontSize: 14, fontWeight: "800", color: "#2B1111" },
  sectionRow: { flexDirection: "row", gap: 12, marginTop: 10, alignItems: "flex-start" },
  sectionId: {
    minWidth: 40,
    textAlign: "center",
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F1E0E0",
    color: "#8B0000",
    fontWeight: "800",
    fontSize: 12,
    overflow: "hidden",
  },
  scheduleText: { fontSize: 13, color: "#5F3B3B", fontWeight: "600", lineHeight: 20 },
  removeBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, alignSelf: "flex-start" },
  removeText: { color: "#DC2626", fontWeight: "700", fontSize: 13 },
});