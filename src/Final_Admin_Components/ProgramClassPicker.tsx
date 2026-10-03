import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  buildAutofill,
  buildSubjectViews,
  defaultSectionFor,
  ExistingClassLite,
  Fetcher,
  ProgramAutofill,
  SectionConfig,
  SubjectView,
  TeacherProgram,
  UNKNOWN_SECTION_ID,
} from "./programHelpers";

const MAX_PROGRAM_BYTES = 15 * 1024 * 1024;
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".docx"];

const fileUriToBase64 = async (uri: string): Promise<string> => {
  if (Platform.OS !== "web") {
    return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  }
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      typeof result === "string" ? resolve(result.split(",")[1] || "") : reject(new Error("Could not read file."));
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(blob);
  });
};

// ─────────────────────────────────────────────────────────────────────────
// Hook: load / upload / replace / remove ONE teacher's program file.
// Used by the teacher's "Upload My Program" screen (drawer menu) and by the
// admin's Add Class modal (upload on a teacher's behalf).
// ─────────────────────────────────────────────────────────────────────────
export function useProgramFile({
  teacherId,
  fetcher,
  enabled,
  showToast,
}: {
  teacherId: string;
  fetcher: Fetcher;
  enabled: boolean; // load only while the screen/modal is open
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}) {
  const [program, setProgram] = useState<TeacherProgram | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!teacherId) {
      setProgram(null);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetcher(`/teacher-program/${encodeURIComponent(teacherId)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Failed to load program.");
      setProgram(body?.data || null);
    } catch (err: any) {
      console.warn("Program load failed:", err);
      setProgram(null);
    } finally {
      setIsLoading(false);
    }
  }, [teacherId, fetcher]);

  useEffect(() => {
    if (!enabled) return;
    setError("");
    load();
  }, [enabled, load]);

  const upload = async () => {
    if (!teacherId) {
      showToast("Select a teacher first.", "error");
      return;
    }
    setError("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf", DOCX_MIME],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setError("No file was selected.");
        return;
      }
      const name = asset.name || "program";
      const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
      if (!ALLOWED_EXTENSIONS.includes(ext) && !(asset.mimeType || "").startsWith("image/")) {
        setError("Upload an image, PDF, or Word (.docx) file.");
        return;
      }
      if (asset.size && asset.size > MAX_PROGRAM_BYTES) {
        setError("Program file must be under 15MB.");
        return;
      }

      setIsUploading(true);
      const fileBase64 = await fileUriToBase64(asset.uri);
      const response = await fetcher("/teacher-program/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, fileName: name, mimeType: asset.mimeType || "", teacherId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Failed to read the program.");
      setProgram(body.data);
      showToast("Program uploaded.", "success");
    } catch (err: any) {
      console.error("Program upload error:", err);
      // Inline: a Toast would render underneath a native <Modal>.
      setError(err?.message || "Failed to upload program.");
    } finally {
      setIsUploading(false);
    }
  };

  const remove = async () => {
    if (!teacherId) return;
    setError("");
    try {
      const response = await fetcher(`/teacher-program/${encodeURIComponent(teacherId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json())?.error || "Failed to remove program.");
      setProgram(null);
    } catch (err: any) {
      setError(err?.message || "Failed to remove program.");
    }
  };

  return { program, isLoading, isUploading, error, upload, remove, reload: load };
}

// ─────────────────────────────────────────────────────────────────────────
// Hook: Create Class modals use this. It READS the saved program and tracks
// which subject/section is chosen; `onApply` writes a pick into the modal's
// existing form fields.
// ─────────────────────────────────────────────────────────────────────────
export function useProgramPicker({
  teacherId,
  fetcher,
  existingClasses,
  sectionConfig,
  enabled,
  showToast,
  onApply,
}: {
  teacherId: string; // teacher's own id (teacher modal) or the selected teacher (admin modal)
  fetcher: Fetcher;
  existingClasses: ExistingClassLite[];
  sectionConfig: SectionConfig;
  enabled: boolean;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  onApply: (fill: ProgramAutofill) => void;
}) {
  const file = useProgramFile({ teacherId, fetcher, enabled, showToast });
  const { program } = file;
  const [active, setActive] = useState<{ key: string; sectionId: string } | null>(null);

  // A reload / replaced file invalidates the current pick.
  useEffect(() => {
    setActive(null);
  }, [program]);

  // Recomputed from live data, so a class created a moment ago vanishes from
  // the picker without any extra bookkeeping.
  const subjects = useMemo(
    () => buildSubjectViews(program, existingClasses, sectionConfig),
    [program, existingClasses, sectionConfig]
  );

  const applyPick = (subject: SubjectView, sectionId: string) => {
    const section = subject.sections.find((s) => s.id === sectionId);
    if (!program || !section || section.state !== "available") return;
    setActive({ key: subject.key, sectionId });
    onApply(buildAutofill(program, subject, section));
  };

  // Selecting a subject: default-check its first available section ("A").
  const selectSubject = (key: string) => {
    const subject = subjects.find((s) => s.key === key);
    if (!subject) return;
    const fallback = defaultSectionFor(subject);
    if (!fallback) return;
    applyPick(subject, fallback.id);
  };

  const selectSection = (key: string, sectionId: string) => {
    const subject = subjects.find((s) => s.key === key);
    if (subject) applyPick(subject, sectionId);
  };

  const clear = () => setActive(null);

  // Locked = a subject WITH known sections is chosen, so the modal's own
  // section grid only allows that subject's open sections. A subject whose
  // program has no section ("?") leaves the grid free for the user to choose.
  const isLocked = !!active && active.sectionId !== UNKNOWN_SECTION_ID;
  const isSectionPickable = (sectionId: string) => {
    if (!active || !isLocked) return true;
    const subject = subjects.find((s) => s.key === active.key);
    return !!subject?.sections.find((s) => s.id === sectionId && s.state === "available");
  };

  return {
    program,
    subjects,
    active,
    isLoading: file.isLoading,
    isUploading: file.isUploading,
    upload: file.upload,
    remove: file.remove,
    selectSubject,
    selectSection,
    clear,
    isLocked,
    isSectionPickable,
  };
}

export type ProgramPickerState = ReturnType<typeof useProgramPicker>;

// ─────────────────────────────────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────────────────────────────────
export default function ProgramClassPicker({
  picker,
  allowUpload = true,
  emptyHint,
}: {
  picker: ProgramPickerState;
  allowUpload?: boolean; // false in the teacher's Create Class modal (upload lives in the drawer menu)
  emptyHint?: string;
}) {
  const { program, subjects, active, isLoading, isUploading } = picker;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="document-text-outline" size={18} color="#8B0000" />
        <Text style={styles.title}>Fill from Program</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerRow}>
          <ActivityIndicator size="small" color="#8B0000" />
          <Text style={styles.muted}>Loading program…</Text>
        </View>
      ) : !program ? (
        <>
          <Text style={styles.muted}>
            {emptyHint ||
              (allowUpload
                ? "Upload the teacher's program (image, PDF, or Word) to pick a subject and fill the form automatically."
                : "No program found. Open the menu and tap Upload My Program to add yours.")}
          </Text>
          {allowUpload && (
            <TouchableOpacity style={styles.uploadBtn} onPress={picker.upload} disabled={isUploading} activeOpacity={0.85}>
              {isUploading ? (
                <>
                  <ActivityIndicator size="small" color="#8B0000" />
                  <Text style={styles.uploadBtnText}>Reading program…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#8B0000" />
                  <Text style={styles.uploadBtnText}>Upload Program</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          <View style={styles.fileRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fileName} numberOfLines={1}>
                {program.fileName}
              </Text>
              <Text style={styles.muted}>
                {[program.semester, program.schoolYear && `A.Y. ${program.schoolYear}`].filter(Boolean).join(" · ") ||
                  "Semester not detected"}
              </Text>
            </View>
            {allowUpload && (
              <TouchableOpacity onPress={picker.upload} disabled={isUploading} style={styles.linkBtn}>
                {isUploading ? (
                  <ActivityIndicator size="small" color="#8B0000" />
                ) : (
                  <Text style={styles.linkBtnText}>Replace</Text>
                )}
              </TouchableOpacity>
            )}
            {allowUpload && (
              <TouchableOpacity onPress={picker.remove} style={styles.linkBtn}>
                <Text style={[styles.linkBtnText, { color: "#DC2626" }]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          {subjects.length === 0 ? (
            <Text style={styles.muted}>Every class in this program has already been created.</Text>
          ) : (
            <>
              <Text style={styles.hint}>
                Tap a subject to fill the form. The first open section is checked by default; sections already created
                are locked.
              </Text>
              {subjects.map((subject) => {
                const isActive = active?.key === subject.key;
                return (
                  <View key={subject.key} style={[styles.subjectCard, isActive && styles.subjectCardActive]}>
                    <TouchableOpacity activeOpacity={0.85} onPress={() => picker.selectSubject(subject.key)}>
                      <View style={styles.subjectTop}>
                        <View style={[styles.radio, isActive && styles.radioActive]}>
                          {isActive && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.subjectTitle}>{subject.title}</Text>
                          <Text style={styles.muted}>
                            {[subject.courseCode, subject.units ? `${subject.units} unit${subject.units === 1 ? "" : "s"}` : ""]
                              .filter(Boolean)
                              .join(" · ") || "From your program"}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.chipRow}>
                      {subject.sections.map((section) => {
                        const isChecked = isActive && active?.sectionId === section.id;
                        const locked = section.state !== "available";
                        return (
                          <TouchableOpacity
                            key={section.id}
                            disabled={locked}
                            activeOpacity={0.85}
                            onPress={() => picker.selectSection(subject.key, section.id)}
                            style={[styles.chip, isChecked && styles.chipChecked, locked && styles.chipLocked]}
                          >
                            <Text style={[styles.chipText, isChecked && styles.chipTextChecked, locked && styles.chipTextLocked]}>
                              {section.id === UNKNOWN_SECTION_ID ? "No section" : section.id}
                            </Text>
                            {locked && (
                              <Text style={styles.chipSub}>
                                {section.state === "created" ? "Created" : "Not in sections"}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {isActive && active?.sectionId === UNKNOWN_SECTION_ID && (
                      <Text style={styles.noSectionHint}>
                        Your program doesn't show a section for this subject. Choose the year and section below.
                      </Text>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#EBD4D4",
    borderRadius: 18,
    backgroundColor: "#FFFBFB",
    padding: 16,
    marginBottom: 22,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: "800", color: "#2B1111" },
  muted: { fontSize: 13, color: "#8A6F6F", lineHeight: 19 },
  hint: { fontSize: 12, color: "#8A6F6F", marginVertical: 10 },
  centerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  uploadBtn: {
    minHeight: 48,
    marginTop: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#8B0000",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  uploadBtnText: { color: "#8B0000", fontWeight: "700", fontSize: 14 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  fileName: { fontSize: 14, fontWeight: "700", color: "#2B1111" },
  linkBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  linkBtnText: { fontSize: 13, fontWeight: "700", color: "#8B0000" },
  subjectCard: {
    borderWidth: 1,
    borderColor: "#EBD4D4",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 12,
    marginBottom: 10,
  },
  subjectCardActive: { borderColor: "#8B0000", backgroundColor: "#FAF5F5" },
  subjectTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  subjectTitle: { fontSize: 14, fontWeight: "700", color: "#2B1111" },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#E2BFBF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  radioActive: { backgroundColor: "#8B0000", borderColor: "#8B0000" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, marginLeft: 30 },
  chip: {
    minWidth: 52,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8CCCC",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  chipChecked: { backgroundColor: "#8B0000", borderColor: "#8B0000" },
  chipLocked: { backgroundColor: "#F3EDED", borderColor: "#E8DCDC", opacity: 0.8 },
  chipText: { fontSize: 13, fontWeight: "800", color: "#7A4A4A" },
  chipTextChecked: { color: "#FFFFFF" },
  chipTextLocked: { color: "#B79A9A", textDecorationLine: "line-through" },
  noSectionHint: { fontSize: 12, color: "#8B0000", marginTop: 10, marginLeft: 30, fontWeight: "600" },
  chipSub: { fontSize: 10, color: "#B79A9A", marginTop: 1 },
});